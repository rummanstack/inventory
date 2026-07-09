import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { EMPLOYEE_ADVANCE_ACTIONS, EMPLOYEE_LOAN_ACTIONS } from "../lib/auditActions.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";
import {
  approveEmployeeAdvance,
  approveEmployeeLoan,
  findEmployeeAdvanceById,
  findEmployeeLoanById,
  insertEmployeeAdvance,
  insertEmployeeLoan,
  listEmployeeAdvances,
  listEmployeeLoans,
  rejectEmployeeAdvance,
  rejectEmployeeLoan,
} from "../repositories/employeeFinanceRepository.js";

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SETTLED"];

function money(value, fieldName) {
  const number = Number(value || 0);
  assert(Number.isFinite(number) && number >= 0, `${fieldName} must be zero or greater.`, 400);
  return Math.round(number * 100) / 100;
}

function normalizeDate(value) {
  const text = String(value || new Date().toISOString().slice(0, 10)).slice(0, 10);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(text), "A valid request date is required.", 400);
  return text;
}

function normalizeFilters(params = {}, actor) {
  const status = String(params.status || "").trim().toUpperCase();
  return {
    tenantId: actor.tenantId,
    status: VALID_STATUSES.includes(status) ? status : null,
    employeeId: String(params.employeeId || "").trim() || null,
  };
}

function decisionNote(input = {}) {
  return String(input.decisionNote || input.decision_note || input.note || "").trim();
}

export class EmployeeFinanceService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listAdvances(params, actor) {
    return this.databaseManager.withClient((client) => listEmployeeAdvances(client, normalizeFilters(params, actor)));
  }

  async requestAdvance(input = {}, actor) {
    const employeeId = String(input.employeeId || input.employee_id || "").trim();
    const amount = money(input.amount, "Advance amount");
    const monthlyRecovery = money(input.monthlyRecovery ?? input.monthly_recovery ?? amount, "Monthly recovery");
    assert(employeeId, "Employee is required.", 400);
    assert(amount > 0, "Advance amount must be greater than zero.", 400);
    assert(monthlyRecovery > 0, "Monthly recovery must be greater than zero.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const employee = await findEmployeeById(client, employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);

      const inserted = await insertEmployeeAdvance(client, {
        id: createId("eadv"),
        tenantId: actor.tenantId,
        employeeId,
        requestDate: normalizeDate(input.requestDate || input.request_date),
        amount,
        monthlyRecovery,
        reason: String(input.reason || "").trim(),
        requestedBy: actor.id,
      });
      const advance = await findEmployeeAdvanceById(client, actor.tenantId, inserted.id);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ADVANCE_ACTIONS.REQUEST,
        entityType: "employee_advance",
        entityId: advance.id,
        module: "hr",
        description: `${actor.name} requested advance for ${advance.employeeName}`,
        after: advance,
      });

      return advance;
    });
  }

  async approveAdvance(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeAdvanceById(client, actor.tenantId, id);
      assert(existing, "Advance not found.", 404);
      assert(existing.status === "PENDING", "Only pending advances can be approved.", 400);
      await approveEmployeeAdvance(client, { tenantId: actor.tenantId, id, actorId: actor.id, decisionNote: decisionNote(input) });
      const advance = await findEmployeeAdvanceById(client, actor.tenantId, id);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ADVANCE_ACTIONS.APPROVE,
        entityType: "employee_advance",
        entityId: id,
        module: "hr",
        description: `${actor.name} approved advance for ${advance.employeeName}`,
        before: existing,
        after: advance,
      });
      return advance;
    });
  }

  async rejectAdvance(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeAdvanceById(client, actor.tenantId, id);
      assert(existing, "Advance not found.", 404);
      assert(existing.status === "PENDING", "Only pending advances can be rejected.", 400);
      await rejectEmployeeAdvance(client, { tenantId: actor.tenantId, id, actorId: actor.id, decisionNote: decisionNote(input) });
      const advance = await findEmployeeAdvanceById(client, actor.tenantId, id);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ADVANCE_ACTIONS.REJECT,
        entityType: "employee_advance",
        entityId: id,
        module: "hr",
        description: `${actor.name} rejected advance for ${advance.employeeName}`,
        before: existing,
        after: advance,
      });
      return advance;
    });
  }

  async listLoans(params, actor) {
    return this.databaseManager.withClient((client) => listEmployeeLoans(client, normalizeFilters(params, actor)));
  }

  async requestLoan(input = {}, actor) {
    const employeeId = String(input.employeeId || input.employee_id || "").trim();
    const principalAmount = money(input.principalAmount ?? input.principal_amount, "Loan amount");
    const installmentAmount = money(input.installmentAmount ?? input.installment_amount, "Installment amount");
    assert(employeeId, "Employee is required.", 400);
    assert(principalAmount > 0, "Loan amount must be greater than zero.", 400);
    assert(installmentAmount > 0, "Installment amount must be greater than zero.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const employee = await findEmployeeById(client, employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);

      const inserted = await insertEmployeeLoan(client, {
        id: createId("eloan"),
        tenantId: actor.tenantId,
        employeeId,
        requestDate: normalizeDate(input.requestDate || input.request_date),
        principalAmount,
        installmentAmount,
        reason: String(input.reason || "").trim(),
        requestedBy: actor.id,
      });
      const loan = await findEmployeeLoanById(client, actor.tenantId, inserted.id);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_LOAN_ACTIONS.REQUEST,
        entityType: "employee_loan",
        entityId: loan.id,
        module: "hr",
        description: `${actor.name} requested loan for ${loan.employeeName}`,
        after: loan,
      });

      return loan;
    });
  }

  async approveLoan(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeLoanById(client, actor.tenantId, id);
      assert(existing, "Loan not found.", 404);
      assert(existing.status === "PENDING", "Only pending loans can be approved.", 400);
      await approveEmployeeLoan(client, { tenantId: actor.tenantId, id, actorId: actor.id, decisionNote: decisionNote(input) });
      const loan = await findEmployeeLoanById(client, actor.tenantId, id);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_LOAN_ACTIONS.APPROVE,
        entityType: "employee_loan",
        entityId: id,
        module: "hr",
        description: `${actor.name} approved loan for ${loan.employeeName}`,
        before: existing,
        after: loan,
      });
      return loan;
    });
  }

  async rejectLoan(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeLoanById(client, actor.tenantId, id);
      assert(existing, "Loan not found.", 404);
      assert(existing.status === "PENDING", "Only pending loans can be rejected.", 400);
      await rejectEmployeeLoan(client, { tenantId: actor.tenantId, id, actorId: actor.id, decisionNote: decisionNote(input) });
      const loan = await findEmployeeLoanById(client, actor.tenantId, id);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_LOAN_ACTIONS.REJECT,
        entityType: "employee_loan",
        entityId: id,
        module: "hr",
        description: `${actor.name} rejected loan for ${loan.employeeName}`,
        before: existing,
        after: loan,
      });
      return loan;
    });
  }
}
