import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { DESIGNATION_ACTIONS } from "../lib/auditActions.js";
import {
  countDesignations,
  findDesignationById,
  findDesignationByName,
  insertDesignation,
  listActiveDesignations,
  listDesignationsPage,
  softDeleteDesignation,
  updateDesignation,
} from "../repositories/designationRepository.js";

const VALID_STATUSES = ["ACTIVE", "INACTIVE"];

function normalizeDesignation(input = {}) {
  const status = String(input.status || "ACTIVE").trim().toUpperCase();
  return {
    name: String(input.name || "").trim(),
    code: String(input.code || "").trim().toUpperCase(),
    status: VALID_STATUSES.includes(status) ? status : "ACTIVE",
    note: String(input.note || "").trim(),
  };
}

export class DesignationService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listDesignations(params = {}, actor) {
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
        listDesignationsPage(client, filters, limit, offset),
        countDesignations(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async listActiveDesignations(actor) {
    return this.databaseManager.withClient((client) => listActiveDesignations(client, actor.tenantId));
  }

  async getDesignation(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const designation = await findDesignationById(client, id, actor.tenantId);
      assert(designation && !designation.deletedAt, "Designation not found.", 404);
      return designation;
    });
  }

  async createDesignation(input, actor) {
    const data = normalizeDesignation(input);
    assert(data.name, "Designation name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const duplicate = await findDesignationByName(client, actor.tenantId, data.name);
      assert(!duplicate, "A designation with this name already exists.", 409);

      const designation = await insertDesignation(client, {
        id: createId("desig"),
        tenantId: actor.tenantId,
        ...data,
        createdBy: actor.id,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: DESIGNATION_ACTIONS.CREATE,
        entityType: "designation",
        entityId: designation.id,
        description: `${actor.name} created designation ${designation.name}`,
        metadata: { code: designation.code, status: designation.status },
      });

      return designation;
    });
  }

  async updateDesignation(id, input, actor) {
    const data = normalizeDesignation(input);
    assert(data.name, "Designation name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findDesignationById(client, id, actor.tenantId);
      assert(existing && !existing.deletedAt, "Designation not found.", 404);

      const duplicate = await findDesignationByName(client, actor.tenantId, data.name, id);
      assert(!duplicate, "A designation with this name already exists.", 409);

      const designation = await updateDesignation(client, { id, tenantId: actor.tenantId, ...data });
      assert(designation, "Designation not found.", 404);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: DESIGNATION_ACTIONS.UPDATE,
        entityType: "designation",
        entityId: id,
        description: `${actor.name} updated designation ${existing.name}`,
        before: existing,
        after: designation,
      });

      return findDesignationById(client, id, actor.tenantId);
    });
  }

  async deleteDesignation(id, input, actor) {
    const reason = String(input?.reason || "").trim();

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findDesignationById(client, id, actor.tenantId);
      assert(existing && !existing.deletedAt, "Designation not found.", 404);
      assert(existing.employeeCount === 0, "Cannot delete a designation with assigned employees.", 400);

      await softDeleteDesignation(client, id, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: DESIGNATION_ACTIONS.DELETE,
        entityType: "designation",
        entityId: id,
        description: `${actor.name} deleted designation ${existing.name}`,
        metadata: { reason },
      });

      return { ok: true };
    });
  }
}
