import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { DEPARTMENT_ACTIONS } from "../lib/auditActions.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";
import {
  countDepartments,
  findDepartmentById,
  findDepartmentByName,
  insertDepartment,
  listActiveDepartments,
  listDepartmentsPage,
  softDeleteDepartment,
  updateDepartment,
} from "../repositories/departmentRepository.js";

const VALID_STATUSES = ["ACTIVE", "INACTIVE"];

function normalizeDepartment(input = {}) {
  const status = String(input.status || "ACTIVE").trim().toUpperCase();
  return {
    name: String(input.name || "").trim(),
    code: String(input.code || "").trim().toUpperCase(),
    status: VALID_STATUSES.includes(status) ? status : "ACTIVE",
    headEmployeeId: String(input.headEmployeeId || "").trim() || null,
    note: String(input.note || "").trim(),
  };
}

export class DepartmentService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async validateHeadEmployee(client, headEmployeeId, tenantId) {
    if (!headEmployeeId) return;
    const employee = await findEmployeeById(client, headEmployeeId, tenantId);
    assert(employee && !employee.deletedAt, "Department head employee not found.", 400);
    assert(employee.status === "ACTIVE", "Department head must be an active employee.", 400);
  }

  async listDepartments(params = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(params);
    const status = VALID_STATUSES.includes(String(params.status || "").toUpperCase())
      ? String(params.status).toUpperCase()
      : null;
    const filters = {
      tenantId: actor.tenantId,
      status,
      search: String(params.search || "").trim() || null,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listDepartmentsPage(client, filters, limit, offset),
        countDepartments(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async listActiveDepartments(actor) {
    return this.databaseManager.withClient((client) => listActiveDepartments(client, actor.tenantId));
  }

  async getDepartment(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const department = await findDepartmentById(client, id, actor.tenantId);
      assert(department && !department.deletedAt, "Department not found.", 404);
      return department;
    });
  }

  async createDepartment(input, actor) {
    const data = normalizeDepartment(input);
    assert(data.name, "Department name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const duplicate = await findDepartmentByName(client, actor.tenantId, data.name);
      assert(!duplicate, "A department with this name already exists.", 409);
      await this.validateHeadEmployee(client, data.headEmployeeId, actor.tenantId);

      const department = await insertDepartment(client, {
        id: createId("dept"),
        tenantId: actor.tenantId,
        ...data,
        createdBy: actor.id,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: DEPARTMENT_ACTIONS.CREATE,
        entityType: "department",
        entityId: department.id,
        description: `${actor.name} created department ${department.name}`,
        metadata: { code: department.code, status: department.status, headEmployeeId: department.headEmployeeId },
      });

      return department;
    });
  }

  async updateDepartment(id, input, actor) {
    const data = normalizeDepartment(input);
    assert(data.name, "Department name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findDepartmentById(client, id, actor.tenantId);
      assert(existing && !existing.deletedAt, "Department not found.", 404);

      const duplicate = await findDepartmentByName(client, actor.tenantId, data.name, id);
      assert(!duplicate, "A department with this name already exists.", 409);
      await this.validateHeadEmployee(client, data.headEmployeeId, actor.tenantId);

      const department = await updateDepartment(client, { id, tenantId: actor.tenantId, ...data });
      assert(department, "Department not found.", 404);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: DEPARTMENT_ACTIONS.UPDATE,
        entityType: "department",
        entityId: id,
        description: `${actor.name} updated department ${existing.name}`,
        before: existing,
        after: department,
      });

      return findDepartmentById(client, id, actor.tenantId);
    });
  }

  async deleteDepartment(id, input, actor) {
    const reason = String(input?.reason || "").trim();

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findDepartmentById(client, id, actor.tenantId);
      assert(existing && !existing.deletedAt, "Department not found.", 404);
      assert(existing.employeeCount === 0, "Cannot delete a department with assigned employees.", 400);

      await softDeleteDepartment(client, id, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: DEPARTMENT_ACTIONS.DELETE,
        entityType: "department",
        entityId: id,
        description: `${actor.name} deleted department ${existing.name}`,
        metadata: { reason },
      });

      return { ok: true };
    });
  }
}


