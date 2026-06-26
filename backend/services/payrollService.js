import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { nextPayrollNumber } from "../lib/payrollNumber.js";
import { PAYROLL_ACTIONS } from "../lib/auditActions.js";
import {
  insertPayroll,
  insertPayrollItems,
  findPayrollById,
  findPayrollByMonth,
  countPayrolls,
  listPayrollsPage,
  updatePayrollStatus,
  updatePayrollTotals,
  findPayrollItems,
  updatePayrollItem,
  deletePayroll,
} from "../repositories/payrollRepository.js";
import { listAllActiveEmployees } from "../repositories/employeeRepository.js";
import { findSalaryStructureByEmployee } from "../repositories/salaryStructureRepository.js";
import { findAccountForUpdate, updateAccountBalance } from "../repositories/financeAccountRepository.js";
import { recordFinanceAccountTransaction } from "./shared/inventoryHelpers.js";

function daysInMonth(month) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon, 0).getDate();
}

function computeItem(emp, ss, month) {
  const workingDays = daysInMonth(month);
  const daysAbsent = 0;
  const daysPresent = workingDays;

  const totalAllowances = (ss.allowances || []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const totalDeductions = (ss.deductions || []).reduce((s, d) => s + Number(d.amount || 0), 0);

  let absentDeduction = 0;
  let grossPay = 0;

  if (ss.payType === "DAILY") {
    grossPay = ss.basicPay * daysPresent;
  } else {
    const dailyRate = workingDays > 0 ? ss.basicPay / workingDays : 0;
    absentDeduction = dailyRate * daysAbsent;
    grossPay = ss.basicPay - absentDeduction;
  }

  const netPay = Math.max(0, grossPay + totalAllowances - totalDeductions);

  return {
    id: createId("pi"),
    employeeId: emp.id,
    employeeName: emp.name,
    department: emp.department,
    designation: emp.designation,
    payType: ss.payType,
    basicPay: ss.basicPay,
    workingDays,
    daysPresent,
    daysAbsent,
    absentDeduction,
    allowances: ss.allowances || [],
    totalAllowances,
    deductions: ss.deductions || [],
    totalDeductions,
    grossPay,
    netPay,
  };
}

export class PayrollService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listPayrolls(params, actor) {
    const { page, pageSize } = parsePagination(params);
    return this.databaseManager.withClient(async (client) => {
      const total = await countPayrolls(client, actor.tenantId);
      const items = await listPayrollsPage(client, actor.tenantId, pageSize, (page - 1) * pageSize);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getPayroll(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const payroll = await findPayrollById(client, id, actor.tenantId);
      assert(payroll, "Payroll not found.", 404);
      const items = await findPayrollItems(client, id, actor.tenantId);
      return { ...payroll, items };
    });
  }

  async generatePayroll(input, actor) {
    const month = String(input.month || "").trim();
    assert(/^\d{4}-\d{2}$/.test(month), "Month must be in YYYY-MM format.", 400);
    const notes = String(input.notes || "").trim();

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findPayrollByMonth(client, month, actor.tenantId);
      assert(!existing, `Payroll for ${month} already exists.`, 400);

      const employees = await listAllActiveEmployees(client, actor.tenantId);
      assert(employees.length > 0, "No active employees found.", 400);

      const year = Number(month.split("-")[0]);
      const payrollNumber = await nextPayrollNumber(client, actor.tenantId, year);
      const payrollId = createId("payroll");

      const rawItems = [];
      for (const emp of employees) {
        const ss = await findSalaryStructureByEmployee(client, emp.id, actor.tenantId);
        if (!ss) continue;
        rawItems.push(computeItem(emp, ss, month));
      }

      assert(rawItems.length > 0, "No employees have salary structures configured.", 400);

      const totalNetPay = rawItems.reduce((s, i) => s + i.netPay, 0);

      await insertPayroll(client, {
        id: payrollId,
        tenantId: actor.tenantId,
        payrollNumber,
        month,
        status: "DRAFT",
        financeAccountId: null,
        totalNetPay,
        notes,
        createdBy: actor.id,
      });

      const items = rawItems.map((item) => ({
        ...item,
        tenantId: actor.tenantId,
        payrollId,
      }));
      await insertPayrollItems(client, items);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: PAYROLL_ACTIONS.GENERATE,
        entityType: "payroll",
        entityId: payrollId,
        description: `${actor.name} generated payroll ${payrollNumber} for ${month}`,
        metadata: { month, totalNetPay, employeeCount: items.length },
      });

      return { id: payrollId, payrollNumber, month, totalNetPay, items };
    });
  }

  async updateItem(payrollId, itemId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const payroll = await findPayrollById(client, payrollId, actor.tenantId);
      assert(payroll, "Payroll not found.", 404);
      assert(payroll.status === "DRAFT", "Can only edit items in a DRAFT payroll.", 400);

      const daysAbsent = Math.max(0, Number(input.daysAbsent || 0));
      const workingDays = daysInMonth(payroll.month);
      const daysPresent = workingDays - daysAbsent;

      const items = await findPayrollItems(client, payrollId, actor.tenantId);
      const item = items.find((i) => i.id === itemId);
      assert(item, "Payroll item not found.", 404);

      let absentDeduction = 0;
      let grossPay = 0;
      if (item.payType === "DAILY") {
        grossPay = item.basicPay * daysPresent;
      } else {
        const dailyRate = workingDays > 0 ? item.basicPay / workingDays : 0;
        absentDeduction = dailyRate * daysAbsent;
        grossPay = item.basicPay - absentDeduction;
      }
      const netPay = Math.max(0, grossPay + item.totalAllowances - item.totalDeductions);

      await updatePayrollItem(client, itemId, payrollId, actor.tenantId, {
        daysAbsent,
        workingDays,
        absentDeduction,
        grossPay,
        netPay,
      });

      const updatedItems = await findPayrollItems(client, payrollId, actor.tenantId);
      const newTotal = updatedItems.reduce((s, i) => s + i.netPay, 0);
      await updatePayrollTotals(client, payrollId, actor.tenantId, newTotal);
    });
  }

  async approvePayroll(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const payroll = await findPayrollById(client, id, actor.tenantId);
      assert(payroll, "Payroll not found.", 404);
      assert(payroll.status === "DRAFT", "Only DRAFT payrolls can be approved.", 400);

      await updatePayrollStatus(client, id, actor.tenantId, "APPROVED");
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: PAYROLL_ACTIONS.APPROVE,
        entityType: "payroll",
        entityId: id,
        description: `${actor.name} approved payroll ${payroll.payrollNumber}`,
        metadata: { month: payroll.month },
      });
    });
  }

  async payPayroll(id, input, actor) {
    const financeAccountId = String(input.financeAccountId || "").trim();
    assert(financeAccountId, "Finance account is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const payroll = await findPayrollById(client, id, actor.tenantId);
      assert(payroll, "Payroll not found.", 404);
      assert(payroll.status === "APPROVED", "Only APPROVED payrolls can be paid.", 400);

      const account = await findAccountForUpdate(client, financeAccountId, actor.tenantId);
      assert(account, "Finance account not found.", 404);
      assert(
        account.balance >= payroll.totalNetPay,
        `Insufficient balance. Available: ${account.balance}, required: ${payroll.totalNetPay}.`,
        400,
      );

      const balanceAfter = account.balance - payroll.totalNetPay;
      const today = new Date().toISOString().slice(0, 10);

      await recordFinanceAccountTransaction(client, {
        tenantId: actor.tenantId,
        accountId: account.id,
        transactionDate: today,
        type: "WITHDRAWAL",
        debit: 0,
        credit: payroll.totalNetPay,
        balanceAfter,
        note: `Salary Payment — ${payroll.payrollNumber} (${payroll.month})`,
        createdById: actor.id,
      });
      await updateAccountBalance(client, account.id, actor.tenantId, balanceAfter);

      await updatePayrollStatus(client, id, actor.tenantId, "PAID", {
        paidAt: new Date().toISOString(),
        paidById: actor.id,
        financeAccountId,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: PAYROLL_ACTIONS.PAY,
        entityType: "payroll",
        entityId: id,
        description: `${actor.name} paid payroll ${payroll.payrollNumber} (${payroll.month})`,
        metadata: { month: payroll.month, totalNetPay: payroll.totalNetPay, accountId: financeAccountId },
      });
    });
  }

  async deletePayroll(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const payroll = await findPayrollById(client, id, actor.tenantId);
      assert(payroll, "Payroll not found.", 404);
      assert(payroll.status !== "PAID", "Cannot delete a paid payroll.", 400);

      await deletePayroll(client, id, actor.tenantId);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: PAYROLL_ACTIONS.DELETE,
        entityType: "payroll",
        entityId: id,
        description: `${actor.name} deleted payroll ${payroll.payrollNumber}`,
        metadata: { month: payroll.month },
      });
    });
  }

  async getPayslip(payrollId, employeeId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const payroll = await findPayrollById(client, payrollId, actor.tenantId);
      assert(payroll, "Payroll not found.", 404);
      const items = await findPayrollItems(client, payrollId, actor.tenantId);
      const item = items.find((i) => i.employeeId === employeeId);
      assert(item, "Payslip not found.", 404);
      return { payroll, item };
    });
  }
}
