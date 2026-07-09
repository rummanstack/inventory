import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { PAYROLL_ACTIONS, SALARY_STRUCTURE_ACTIONS } from "../lib/auditActions.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";
import { applyPayrollRecoveries, listPayrollRecoveries } from "../repositories/employeeFinanceRepository.js";
import {
  approvePayrollRun,
  findPayrollRunById,
  findPayrollRunByMonth,
  findPayrollRunItem,
  findSalaryStructureByEmployee,
  insertPayrollRun,
  insertPayrollRunItem,
  listPayrollAttendanceSummary,
  listPayrollLeaveSummary,
  listPayrollRunItems,
  listPayrollRuns,
  listPayrollSourceEmployees,
  listSalaryStructures,
  upsertSalaryStructure,
} from "../repositories/payrollRepository.js";

const VALID_STRUCTURE_STATUSES = ["ACTIVE", "INACTIVE"];

function money(value, fieldName) {
  const number = Number(value || 0);
  assert(Number.isFinite(number) && number >= 0, `${fieldName} must be zero or greater.`, 400);
  return Math.round(number * 100) / 100;
}

function normalizeMonth(value) {
  const text = String(value || "").trim().slice(0, 7);
  assert(/^\d{4}-\d{2}$/.test(text), "A valid payroll month is required.", 400);
  return text;
}

function normalizeDate(value, fallback) {
  const text = String(value || fallback || "").slice(0, 10);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(text), "A valid effective date is required.", 400);
  return text;
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function takeRecoveries(rows, limit, amountField) {
  let remaining = roundMoney(limit);
  let total = 0;
  const selected = [];
  for (const row of rows || []) {
    if (remaining <= 0) break;
    const scheduled = Number(row[amountField] || row.outstanding_amount || 0);
    const amount = roundMoney(Math.min(remaining, Number(row.outstanding_amount || 0), scheduled));
    if (amount <= 0) continue;
    selected.push({ id: row.id, amount });
    total += amount;
    remaining = roundMoney(remaining - amount);
  }
  return { total: roundMoney(total), selected };
}

function normalizeSalaryStructure(input = {}) {
  const basicSalary = money(input.basicSalary ?? input.basic_salary, "Basic salary");
  const allowances = money(input.allowances, "Allowances");
  const deductions = money(input.deductions, "Deductions");
  const grossSalary = money(input.grossSalary ?? input.gross_salary ?? basicSalary + allowances, "Gross salary");
  const status = String(input.status || "ACTIVE").trim().toUpperCase();
  assert(grossSalary >= deductions, "Gross salary cannot be less than fixed deductions.", 400);
  return {
    employeeId: String(input.employeeId || input.employee_id || "").trim(),
    basicSalary,
    allowances,
    deductions,
    grossSalary,
    effectiveFrom: normalizeDate(input.effectiveFrom || input.effective_from, new Date().toISOString().slice(0, 10)),
    status: VALID_STRUCTURE_STATUSES.includes(status) ? status : "ACTIVE",
    note: String(input.note || "").trim(),
  };
}

export class PayrollService {
  constructor(databaseManager, { auditService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
  }

  async listSalaryStructures(actor) {
    return this.databaseManager.withClient((client) => listSalaryStructures(client, actor.tenantId));
  }

  async saveSalaryStructure(input, actor) {
    const data = normalizeSalaryStructure(input);
    assert(data.employeeId, "Employee is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const employee = await findEmployeeById(client, data.employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);

      const existing = await findSalaryStructureByEmployee(client, actor.tenantId, data.employeeId);
      const saved = await upsertSalaryStructure(client, {
        id: existing?.id || createId("salstruct"),
        tenantId: actor.tenantId,
        ...data,
        actorId: actor.id,
      });
      const structure = await findSalaryStructureByEmployee(client, actor.tenantId, data.employeeId);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: SALARY_STRUCTURE_ACTIONS.SAVE,
        entityType: "salary_structure",
        entityId: saved.id,
        module: "hr",
        description: `${actor.name} saved salary structure for ${employee.name}`,
        before: existing || {},
        after: structure,
      });

      return structure;
    });
  }

  async listPayrollRuns(actor) {
    return this.databaseManager.withClient((client) => listPayrollRuns(client, actor.tenantId));
  }

  async getPayrollRun(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const run = await findPayrollRunById(client, actor.tenantId, id);
      assert(run, "Payroll run not found.", 404);
      const items = await listPayrollRunItems(client, actor.tenantId, id);
      return { run, items };
    });
  }

  async generatePayroll(input = {}, actor) {
    const payrollMonth = normalizeMonth(input.month || input.payrollMonth);
    const monthDays = daysInMonth(payrollMonth);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findPayrollRunByMonth(client, actor.tenantId, payrollMonth);
      assert(!existing, "Payroll has already been generated for this month.", 409);

      const employees = await listPayrollSourceEmployees(client, actor.tenantId);
      assert(employees.length > 0, "No active employees found for payroll.", 400);
      const attendanceRows = await listPayrollAttendanceSummary(client, actor.tenantId, payrollMonth);
      const leaveRows = await listPayrollLeaveSummary(client, actor.tenantId, payrollMonth);
      const recoveryRows = await listPayrollRecoveries(client, actor.tenantId);
      const attendanceByEmployee = new Map(attendanceRows.map((row) => [row.employee_id, row]));
      const leaveByEmployee = new Map(leaveRows.map((row) => [row.employee_id, row]));
      const advancesByEmployee = new Map();
      const loansByEmployee = new Map();
      const appliedRecoveries = { advances: [], loans: [] };

      for (const row of recoveryRows.advances) {
        if (!advancesByEmployee.has(row.employee_id)) advancesByEmployee.set(row.employee_id, []);
        advancesByEmployee.get(row.employee_id).push(row);
      }
      for (const row of recoveryRows.loans) {
        if (!loansByEmployee.has(row.employee_id)) loansByEmployee.set(row.employee_id, []);
        loansByEmployee.get(row.employee_id).push(row);
      }

      const computedItems = employees.map((employee) => {
        const hasActiveStructure = employee.salary_structure_status === "ACTIVE";
        const salaryAmount = roundMoney(employee.salary_amount);
        const allowances = roundMoney(hasActiveStructure ? employee.allowances : 0);
        const fixedDeductions = roundMoney(hasActiveStructure ? employee.deductions : 0);
        const basicSalary = roundMoney(hasActiveStructure ? employee.basic_salary : salaryAmount);
        const attendance = attendanceByEmployee.get(employee.id) || {};
        const leave = leaveByEmployee.get(employee.id) || {};
        const presentDays = Number(attendance.present_days || 0);
        const absentDays = Number(attendance.absent_days || 0);
        const paidLeaveDays = Number(leave.paid_leave_days || 0);
        const unpaidLeaveDays = Number(leave.unpaid_leave_days || 0);
        const unpaidDays = absentDays + unpaidLeaveDays;
        const isDaily = !hasActiveStructure && employee.pay_type === "DAILY";
        const payableDays = Math.max(0, roundMoney(isDaily ? presentDays + paidLeaveDays : monthDays - unpaidDays));
        const grossSalary = roundMoney(hasActiveStructure ? employee.gross_salary : (isDaily ? salaryAmount * payableDays : salaryAmount));
        const dailyRate = monthDays > 0 ? grossSalary / monthDays : 0;
        const attendanceDeduction = isDaily ? 0 : roundMoney(dailyRate * unpaidDays);
        const beforeRecoveryNetPay = Math.max(0, roundMoney(grossSalary - fixedDeductions - attendanceDeduction));
        const advanceRecoveryResult = takeRecoveries(advancesByEmployee.get(employee.id), beforeRecoveryNetPay, "monthly_recovery");
        const afterAdvanceNetPay = roundMoney(beforeRecoveryNetPay - advanceRecoveryResult.total);
        const loanRecoveryResult = takeRecoveries(loansByEmployee.get(employee.id), afterAdvanceNetPay, "installment_amount");
        const advanceRecovery = advanceRecoveryResult.total;
        const loanRecovery = loanRecoveryResult.total;
        const netPay = Math.max(0, roundMoney(beforeRecoveryNetPay - advanceRecovery - loanRecovery));

        appliedRecoveries.advances.push(...advanceRecoveryResult.selected);
        appliedRecoveries.loans.push(...loanRecoveryResult.selected);

        return {
          id: createId("payitem"),
          tenantId: actor.tenantId,
          employeeId: employee.id,
          employeeName: employee.name,
          employeeNumber: employee.employee_number || "",
          departmentName: employee.department_name || "",
          designationName: employee.designation_name || "",
          basicSalary,
          allowances,
          fixedDeductions,
          grossSalary,
          presentDays,
          absentDays,
          paidLeaveDays,
          unpaidLeaveDays,
          payableDays,
          attendanceDeduction,
          advanceRecovery,
          loanRecovery,
          netPay,
        };
      });

      const totals = computedItems.reduce(
        (acc, item) => ({
          grossTotal: acc.grossTotal + item.grossSalary,
          allowanceTotal: acc.allowanceTotal + item.allowances,
          deductionTotal: acc.deductionTotal + item.fixedDeductions + item.advanceRecovery + item.loanRecovery,
          attendanceDeductionTotal: acc.attendanceDeductionTotal + item.attendanceDeduction,
          netTotal: acc.netTotal + item.netPay,
        }),
        { grossTotal: 0, allowanceTotal: 0, deductionTotal: 0, attendanceDeductionTotal: 0, netTotal: 0 },
      );

      const run = await insertPayrollRun(client, {
        id: createId("payrun"),
        tenantId: actor.tenantId,
        payrollMonth,
        totalEmployees: computedItems.length,
        grossTotal: roundMoney(totals.grossTotal),
        allowanceTotal: roundMoney(totals.allowanceTotal),
        deductionTotal: roundMoney(totals.deductionTotal),
        attendanceDeductionTotal: roundMoney(totals.attendanceDeductionTotal),
        netTotal: roundMoney(totals.netTotal),
        generatedBy: actor.id,
        note: String(input.note || "").trim(),
      });

      const items = [];
      for (const item of computedItems) {
        items.push(await insertPayrollRunItem(client, { ...item, payrollRunId: run.id }));
      }
      await applyPayrollRecoveries(client, actor.tenantId, appliedRecoveries);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: PAYROLL_ACTIONS.GENERATE,
        entityType: "payroll_run",
        entityId: run.id,
        module: "hr",
        description: `${actor.name} generated payroll for ${payrollMonth}`,
        after: { run, itemCount: items.length },
      });

      return { run, items };
    });
  }

  async approvePayroll(id, input = {}, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findPayrollRunById(client, actor.tenantId, id);
      assert(existing, "Payroll run not found.", 404);
      assert(existing.status === "DRAFT", "Only draft payroll runs can be approved.", 400);
      assert(existing.netTotal > 0, "Payroll net total must be greater than zero.", 400);

      const journalEntry = await this.journalService.postPayrollRun(client, actor, {
        payrollRunId: existing.id,
        payrollMonth: existing.payrollMonth,
        netTotal: existing.netTotal,
      });
      const approved = await approvePayrollRun(client, {
        tenantId: actor.tenantId,
        id,
        actorId: actor.id,
        journalEntryId: journalEntry.id,
      });
      assert(approved, "Only draft payroll runs can be approved.", 400);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: PAYROLL_ACTIONS.APPROVE,
        entityType: "payroll_run",
        entityId: id,
        module: "hr",
        description: `${actor.name} approved payroll for ${approved.payrollMonth}`,
        before: existing,
        after: approved,
        metadata: { journalEntryId: journalEntry.id, note: String(input.note || "").trim() },
      });

      return approved;
    });
  }

  async getPayslip(payrollRunId, employeeId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const run = await findPayrollRunById(client, actor.tenantId, payrollRunId);
      assert(run, "Payroll run not found.", 404);
      const item = await findPayrollRunItem(client, actor.tenantId, payrollRunId, employeeId);
      assert(item, "Payslip not found.", 404);
      return { run, item };
    });
  }

  async payrollRegister(params = {}, actor) {
    const month = params.month ? normalizeMonth(params.month) : null;
    const runs = await this.databaseManager.withClient((client) => listPayrollRuns(client, actor.tenantId));
    const filtered = month ? runs.filter((run) => run.payrollMonth === month) : runs;
    const totals = filtered.reduce(
      (acc, run) => ({
        runCount: acc.runCount + 1,
        totalEmployees: acc.totalEmployees + run.totalEmployees,
        grossTotal: acc.grossTotal + run.grossTotal,
        deductionTotal: acc.deductionTotal + run.deductionTotal,
        attendanceDeductionTotal: acc.attendanceDeductionTotal + run.attendanceDeductionTotal,
        netTotal: acc.netTotal + run.netTotal,
      }),
      { runCount: 0, totalEmployees: 0, grossTotal: 0, deductionTotal: 0, attendanceDeductionTotal: 0, netTotal: 0 },
    );
    return { items: filtered, totals };
  }
}
