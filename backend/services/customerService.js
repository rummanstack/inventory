import { assert } from "../lib/errors.js";
import { normalizeCustomer } from "../lib/normalizers.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import {
  countCustomers,
  deleteCustomer,
  findCustomerById,
  insertCustomer,
  listCustomersPage,
  mapCustomer,
  updateCustomer,
} from "../repositories/customerRepository.js";

export class CustomerService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) {
      return;
    }

    await this.auditService.record(client, {
      tenantId: actor.tenantId || null,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      description: payload.description,
      metadata: {
        actorName: actor.name,
        actorRole: actor.role,
        ...payload.metadata,
      },
    });
  }

  async listCustomers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const status = query.status === "ACTIVE" || query.status === "INACTIVE" ? query.status : undefined;
    const assignedDsrId = String(query.assignedDsrId || "").trim() || undefined;
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listCustomersPage(client, { search, status, assignedDsrId, tenantId, limit, offset }),
        countCustomers(client, { search, status, assignedDsrId, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getCustomer(customerId, actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const result = await findCustomerById(client, customerId, actor.tenantId);
      assert(result.rowCount > 0, "Customer not found.", 404);
      return mapCustomer(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async saveCustomer(input, actor) {
    const customer = normalizeCustomer(input);
    assert(customer.shopName, "Shop name is required.");
    customer.tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existingResult = await findCustomerById(client, customer.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "Customer not found.", 404);
        result = await updateCustomer(client, customer);
        assert(result.rowCount > 0, "Customer not found.", 404);

        await this.recordActivity(client, actor, {
          actionType: "customer.update",
          entityType: "customer",
          entityId: customer.id,
          description: `${actor.name} updated customer ${customer.shopName}`,
          metadata: { shopName: customer.shopName, status: customer.status },
        });
      } else {
        customer.createdById = actor.id;
        result = await insertCustomer(client, customer);

        await this.recordActivity(client, actor, {
          actionType: "customer.create",
          entityType: "customer",
          entityId: customer.id,
          description: `${actor.name} created customer ${customer.shopName}`,
          metadata: { shopName: customer.shopName, status: customer.status },
        });
      }

      const fullResult = await findCustomerById(client, result.rows[0].id, actor.tenantId);
      return mapCustomer(fullResult.rows[0]);
    });
  }

  async removeCustomer(customerId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findCustomerById(client, customerId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Customer not found.", 404);

      await deleteCustomer(client, customerId, actor.tenantId);

      await this.recordActivity(client, actor, {
        actionType: "customer.delete",
        entityType: "customer",
        entityId: customerId,
        description: `${actor.name} deleted customer ${existingResult.rows[0].shop_name}`,
      });

      return { ok: true };
    });
  }
}
