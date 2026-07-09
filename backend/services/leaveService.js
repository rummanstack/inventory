import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import { LEAVE_REQUEST_ACTIONS, LEAVE_TYPE_ACTIONS } from "../lib/auditActions.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";
import {
  approveLeaveRequest,
  countLeaveRequests,
  countLeaveTypes,
  findLeaveRequestById,
  findLeaveTypeById,
  findLeaveTypeByName,
  findOverlappingLeaveRequest,
  getLeaveReportSummary,
  insertLeaveRequest,
  insertLeaveType,
  listActiveLeaveTypes,
  listLeaveRequestsPage,
  listLeaveTypesPage,
  rejectLeaveRequest,
  softDeleteLeaveType,
  updateLeaveType,
} from "../repositories/leaveRepository.js";

const VALID_TYPE_STATUSES = ["ACTIVE", "INACTIVE"];
const VALID_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

function normalizeDate(value, fieldName) {
  const text = String(value || "").slice(0, 10);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(text), `${fieldName} is required.`, 400);
  const parsed = new Date(`${text}T00:00:00.000Z`);
  assert(!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text, `${fieldName} is invalid.`, 400);
  return text;
}

function normalizeOptionalDate(value, fieldName) {
  return value ? normalizeDate(value, fieldName) : null;
}

function daysInclusive(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  assert(end >= start, "Leave end date cannot be before start date.", 400);
  return Math.floor((end - start) / 86400000) + 1;
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeLeaveType(input = {}) {
  const status = String(input.status || "ACTIVE").trim().toUpperCase();
  const annualDays = Number(input.annualDays ?? input.annual_days ?? 0);
  assert(Number.isFinite(annualDays) && annualDays >= 0, "Annual leave days must be zero or greater.", 400);
  return {
    name: String(input.name || "").trim(),
    code: String(input.code || "").trim().toUpperCase(),
    status: VALID_TYPE_STATUSES.includes(status) ? status : "ACTIVE",
    paid: normalizeBoolean(input.paid, true),
    annualDays: Math.round(annualDays),
    carryForward: normalizeBoolean(input.carryForward ?? input.carry_forward, false),
    note: String(input.note || "").trim(),
  };
}

function normalizeLeaveRequest(input = {}) {
  const startDate = normalizeDate(input.startDate || input.start_date, "Leave start date");
  const endDate = normalizeDate(input.endDate || input.end_date, "Leave end date");
  return {
    employeeId: String(input.employeeId || input.employee_id || "").trim(),
    leaveTypeId: String(input.leaveTypeId || input.leave_type_id || "").trim(),
    startDate,
    endDate,
    totalDays: daysInclusive(startDate, endDate),
    reason: String(input.reason || "").trim(),
  };
}

function normalizeRequestStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  return VALID_REQUEST_STATUSES.includes(status) ? status : null;
}

function normalizeTypeStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  return VALID_TYPE_STATUSES.includes(status) ? status : null;
}

function normalizeDecisionNote(input = {}) {
  return String(input.decisionNote || input.decision_note || input.note || "").trim();
}

function normalizeRequestFilters(params = {}, actor) {
  return {
    tenantId: actor.tenantId,
    status: normalizeRequestStatus(params.status),
    employeeId: String(params.employeeId || "").trim() || null,
    leaveTypeId: String(params.leaveTypeId || "").trim() || null,
    departmentId: String(params.departmentId || "").trim() || null,
    fromDate: normalizeOptionalDate(params.fromDate || params.startDate, "From date"),
    toDate: normalizeOptionalDate(params.toDate || params.endDate, "To date"),
  };
}

export class LeaveService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listLeaveTypes(params = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(params);
    const filters = {
      tenantId: actor.tenantId,
      status: normalizeTypeStatus(params.status),
      search: String(params.search || "").trim() || null,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listLeaveTypesPage(client, filters, limit, offset),
        countLeaveTypes(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async listActiveLeaveTypes(actor) {
    return this.databaseManager.withClient((client) => listActiveLeaveTypes(client, actor.tenantId));
  }

  async createLeaveType(input, actor) {
    const data = normalizeLeaveType(input);
    assert(data.name, "Leave type name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const duplicate = await findLeaveTypeByName(client, actor.tenantId, data.name);
      assert(!duplicate, "A leave type with this name already exists.", 409);

      const leaveType = await insertLeaveType(client, {
        id: createId("ltyp"),
        tenantId: actor.tenantId,
        ...data,
        createdBy: actor.id,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: LEAVE_TYPE_ACTIONS.CREATE,
        entityType: "leave_type",
        entityId: leaveType.id,
        module: "hr",
        description: `${actor.name} created leave type ${leaveType.name}`,
        after: leaveType,
      });

      return leaveType;
    });
  }

  async updateLeaveType(id, input, actor) {
    const data = normalizeLeaveType(input);
    assert(data.name, "Leave type name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findLeaveTypeById(client, actor.tenantId, id);
      assert(existing && !existing.deletedAt, "Leave type not found.", 404);

      const duplicate = await findLeaveTypeByName(client, actor.tenantId, data.name, id);
      assert(!duplicate, "A leave type with this name already exists.", 409);

      const leaveType = await updateLeaveType(client, { id, tenantId: actor.tenantId, ...data });
      assert(leaveType, "Leave type not found.", 404);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: LEAVE_TYPE_ACTIONS.UPDATE,
        entityType: "leave_type",
        entityId: id,
        module: "hr",
        description: `${actor.name} updated leave type ${existing.name}`,
        before: existing,
        after: leaveType,
      });

      return findLeaveTypeById(client, actor.tenantId, id);
    });
  }

  async deleteLeaveType(id, input, actor) {
    const reason = String(input?.reason || "").trim();

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findLeaveTypeById(client, actor.tenantId, id);
      assert(existing && !existing.deletedAt, "Leave type not found.", 404);
      assert(existing.requestCount === 0, "Cannot delete a leave type that has leave requests.", 400);

      await softDeleteLeaveType(client, actor.tenantId, id, { deletedById: actor.id, deleteReason: reason });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: LEAVE_TYPE_ACTIONS.DELETE,
        entityType: "leave_type",
        entityId: id,
        module: "hr",
        description: `${actor.name} deleted leave type ${existing.name}`,
        metadata: { reason },
      });

      return { ok: true };
    });
  }

  async listLeaveRequests(params = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(params);
    const filters = normalizeRequestFilters(params, actor);

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listLeaveRequestsPage(client, filters, limit, offset),
        countLeaveRequests(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getLeaveRequest(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const leaveRequest = await findLeaveRequestById(client, actor.tenantId, id);
      assert(leaveRequest, "Leave request not found.", 404);
      return leaveRequest;
    });
  }

  async applyLeave(input, actor) {
    const data = normalizeLeaveRequest(input);
    assert(data.employeeId, "Employee is required.", 400);
    assert(data.leaveTypeId, "Leave type is required.", 400);
    assert(data.reason, "Leave reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const employee = await findEmployeeById(client, data.employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);
      assert(employee.status === "ACTIVE", "Leave can only be applied for an active employee.", 400);

      const leaveType = await findLeaveTypeById(client, actor.tenantId, data.leaveTypeId);
      assert(leaveType && !leaveType.deletedAt, "Leave type not found.", 404);
      assert(leaveType.status === "ACTIVE", "Leave type is inactive.", 400);

      const overlap = await findOverlappingLeaveRequest(client, { tenantId: actor.tenantId, ...data });
      assert(!overlap, "Employee already has a pending or approved leave request in this date range.", 409);

      const inserted = await insertLeaveRequest(client, {
        id: createId("lreq"),
        tenantId: actor.tenantId,
        ...data,
        requestedBy: actor.id,
      });
      const leaveRequest = await findLeaveRequestById(client, actor.tenantId, inserted.id);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: LEAVE_REQUEST_ACTIONS.APPLY,
        entityType: "leave_request",
        entityId: leaveRequest.id,
        module: "hr",
        description: `${actor.name} applied leave for ${leaveRequest.employeeName}`,
        after: leaveRequest,
      });

      return leaveRequest;
    });
  }

  async approveLeave(id, input, actor) {
    const decisionNote = normalizeDecisionNote(input);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findLeaveRequestById(client, actor.tenantId, id);
      assert(existing, "Leave request not found.", 404);
      assert(existing.status === "PENDING", "Only pending leave requests can be approved.", 400);

      const updated = await approveLeaveRequest(client, { tenantId: actor.tenantId, id, actorId: actor.id, decisionNote });
      assert(updated, "Only pending leave requests can be approved.", 400);
      const leaveRequest = await findLeaveRequestById(client, actor.tenantId, id);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: LEAVE_REQUEST_ACTIONS.APPROVE,
        entityType: "leave_request",
        entityId: id,
        module: "hr",
        description: `${actor.name} approved leave for ${leaveRequest.employeeName}`,
        before: existing,
        after: leaveRequest,
      });

      return leaveRequest;
    });
  }

  async rejectLeave(id, input, actor) {
    const decisionNote = normalizeDecisionNote(input);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findLeaveRequestById(client, actor.tenantId, id);
      assert(existing, "Leave request not found.", 404);
      assert(existing.status === "PENDING", "Only pending leave requests can be rejected.", 400);

      const updated = await rejectLeaveRequest(client, { tenantId: actor.tenantId, id, actorId: actor.id, decisionNote });
      assert(updated, "Only pending leave requests can be rejected.", 400);
      const leaveRequest = await findLeaveRequestById(client, actor.tenantId, id);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: LEAVE_REQUEST_ACTIONS.REJECT,
        entityType: "leave_request",
        entityId: id,
        module: "hr",
        description: `${actor.name} rejected leave for ${leaveRequest.employeeName}`,
        before: existing,
        after: leaveRequest,
      });

      return leaveRequest;
    });
  }

  async leaveCalendar(params = {}, actor) {
    const filters = normalizeRequestFilters({ ...params, status: params.status || "APPROVED" }, actor);
    return this.databaseManager.withClient((client) => listLeaveRequestsPage(client, filters, 500, 0));
  }

  async leaveReport(params = {}, actor) {
    const filters = normalizeRequestFilters(params, actor);
    return this.databaseManager.withClient(async (client) => {
      const summary = await getLeaveReportSummary(client, filters);
      const totals = summary.reduce(
        (acc, item) => ({
          requestCount: acc.requestCount + item.requestCount,
          totalDays: acc.totalDays + item.totalDays,
        }),
        { requestCount: 0, totalDays: 0 },
      );
      return { items: summary, totals };
    });
  }
}
