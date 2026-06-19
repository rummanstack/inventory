import { assert } from "../lib/errors.js";
import { normalizeRetailCustomer } from "../lib/normalizers.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import {
  countRetailCustomers,
  countTrashedRetailCustomers,
  findRetailCustomerById,
  insertRetailCustomer,
  listAllActiveRetailCustomers,
  listRetailCustomersPage,
  listTrashedRetailCustomers,
  mapRetailCustomer,
  permanentlyDeleteRetailCustomer,
  restoreRetailCustomer,
  softDeleteRetailCustomer,
  updateRetailCustomer,
} from "../repositories/retailCustomerRepository.js";

export class RetailCustomerService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) return;
    await this.auditService.record(client, {
      tenantId: actor.tenantId || null,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      module: payload.module || "retail-customers",
      before: payload.before,
      after: payload.after,
      reason: payload.reason,
      description: payload.description,
      metadata: { actorName: actor.name, actorRole: actor.role, ...payload.metadata },
    });
  }

  async listRetailCustomers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const status = query.status === "ACTIVE" || query.status === "INACTIVE" ? query.status : undefined;
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listRetailCustomersPage(client, { search, status, tenantId, limit, offset }),
        countRetailCustomers(client, { search, status, tenantId }),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async listActiveRetailCustomers(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return listAllActiveRetailCustomers(client, actor.tenantId);
    } finally {
      client.release();
    }
  }

  async getRetailCustomer(id, actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const result = await findRetailCustomerById(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Retail customer not found.", 404);
      return mapRetailCustomer(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async saveRetailCustomer(input, actor) {
    const customer = normalizeRetailCustomer(input);
    assert(customer.name, "Customer name is required.");
    customer.tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existing = await findRetailCustomerById(client, customer.id, actor.tenantId);
        assert(existing.rowCount > 0, "Retail customer not found.", 404);
        customer.loyaltyPointsBalance = Number(existing.rows[0].loyalty_points_balance || 0);
        result = await updateRetailCustomer(client, customer);
        assert(result.rowCount > 0, "Retail customer not found.", 404);

        await this.recordActivity(client, actor, {
          actionType: "retail_customer.update",
          entityType: "retail_customer",
          entityId: customer.id,
          description: `${actor.name} updated retail customer ${customer.name}`,
        });
      } else {
        customer.createdById = actor.id;
        customer.loyaltyPointsBalance = Math.max(0, Number(customer.loyaltyPointsBalance || 0));
        result = await insertRetailCustomer(client, customer);

        await this.recordActivity(client, actor, {
          actionType: "retail_customer.create",
          entityType: "retail_customer",
          entityId: customer.id,
          description: `${actor.name} created retail customer ${customer.name}`,
        });
      }

      const fullResult = await findRetailCustomerById(client, result.rows[0].id, actor.tenantId);
      return mapRetailCustomer(fullResult.rows[0]);
    });
  }

  async removeRetailCustomer(id, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findRetailCustomerById(client, id, actor.tenantId);
      assert(existing.rowCount > 0, "Retail customer not found.", 404);

      await softDeleteRetailCustomer(client, id, actor.tenantId, { deletedById: actor.id, deleteReason: reason });

      await this.recordActivity(client, actor, {
        actionType: "retail_customer.delete",
        entityType: "retail_customer",
        entityId: id,
        description: `${actor.name} moved retail customer ${existing.rows[0].name} to trash${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async restoreRetailCustomer(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreRetailCustomer(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Retail customer not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: "retail_customer.restore",
        entityType: "retail_customer",
        entityId: id,
        description: `${actor.name} restored retail customer ${result.rows[0].name} from trash`,
      });

      return { ok: true };
    });
  }

  async permanentlyDeleteRetailCustomer(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteRetailCustomer(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Retail customer not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: "retail_customer.permanent_delete",
        entityType: "retail_customer",
        entityId: id,
        description: `${actor.name} permanently deleted retail customer ${id}`,
      });

      return { ok: true };
    });
  }

  async listTrashedRetailCustomers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedRetailCustomers(client, { tenantId, limit, offset }),
        countTrashedRetailCustomers(client, tenantId),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }
}
