import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { nextEmployeeNumber } from "../lib/employeeNumber.js";
import { EMPLOYEE_ACTIONS } from "../lib/auditActions.js";
import {
  insertEmployee,
  updateEmployee,
  findEmployeeById,
  countEmployees,
  listEmployeesPage,
  listAllActiveEmployees,
  softDeleteEmployee,
  restoreEmployee,
} from "../repositories/employeeRepository.js";

const VALID_STATUSES = ["ACTIVE", "INACTIVE"];

function normalizeEmployee(input) {
  return {
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim(),
    address: String(input.address || "").trim(),
    department: String(input.department || "").trim(),
    designation: String(input.designation || "").trim(),
    joinDate: input.joinDate ? String(input.joinDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    status: VALID_STATUSES.includes(String(input.status || "").toUpperCase())
      ? String(input.status).toUpperCase()
      : "ACTIVE",
    note: String(input.note || "").trim(),
  };
}

export class EmployeeService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listEmployees(params, actor) {
    const { page, pageSize } = parsePagination(params);
    return this.databaseManager.withClient(async (client) => {
      const filterParams = {
        tenantId: actor.tenantId,
        status: params.status || null,
        department: params.department || null,
        search: params.search || null,
      };
      const total = await countEmployees(client, filterParams);
      const items = await listEmployeesPage(client, filterParams, pageSize, (page - 1) * pageSize);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async listActiveEmployees(actor) {
    return this.databaseManager.withClient((client) =>
      listAllActiveEmployees(client, actor.tenantId),
    );
  }

  async getEmployee(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const emp = await findEmployeeById(client, id, actor.tenantId);
      assert(emp, "Employee not found.", 404);
      return emp;
    });
  }

  async createEmployee(input, actor) {
    const data = normalizeEmployee(input);
    assert(data.name, "Employee name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const year = new Date().getFullYear();
      const employeeNumber = await nextEmployeeNumber(client, actor.tenantId, year);
      const emp = {
        id: createId("emp"),
        tenantId: actor.tenantId,
        employeeNumber,
        ...data,
        createdBy: actor.id,
      };
      await insertEmployee(client, emp);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.CREATE,
        entityType: "employee",
        entityId: emp.id,
        description: `${actor.name} added employee ${emp.name}`,
        metadata: { employeeNumber },
      });
      return emp;
    });
  }

  async updateEmployee(id, input, actor) {
    const data = normalizeEmployee(input);
    assert(data.name, "Employee name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeById(client, id, actor.tenantId);
      assert(existing, "Employee not found.", 404);
      assert(!existing.deletedAt, "Cannot update a deleted employee.", 400);

      await updateEmployee(client, { id, tenantId: actor.tenantId, ...data });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.UPDATE,
        entityType: "employee",
        entityId: id,
        description: `${actor.name} updated employee ${existing.name}`,
        metadata: {},
      });
      return findEmployeeById(client, id, actor.tenantId);
    });
  }

  async deleteEmployee(id, input, actor) {
    const reason = String(input.reason || "").trim();
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeById(client, id, actor.tenantId);
      assert(existing, "Employee not found.", 404);
      assert(!existing.deletedAt, "Employee already deleted.", 400);

      await softDeleteEmployee(client, id, actor.tenantId, actor.id, reason);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.DELETE,
        entityType: "employee",
        entityId: id,
        description: `${actor.name} deleted employee ${existing.name}`,
        metadata: { reason },
      });
    });
  }

  async restoreEmployee(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeById(client, id, actor.tenantId);
      assert(existing, "Employee not found.", 404);
      assert(existing.deletedAt, "Employee is not deleted.", 400);

      await restoreEmployee(client, id, actor.tenantId);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.RESTORE,
        entityType: "employee",
        entityId: id,
        description: `${actor.name} restored employee ${existing.name}`,
        metadata: {},
      });
    });
  }
}
