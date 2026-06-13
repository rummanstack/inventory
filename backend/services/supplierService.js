import { assert } from "../lib/errors.js";
import { normalizeSupplier } from "../lib/normalizers.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import { SUPPLIER_ACTIONS } from "../lib/auditActions.js";
import {
  countSuppliers,
  countTrashedSuppliers,
  listTrashedSuppliers,
  permanentlyDeleteSupplier,
  restoreSupplier,
  softDeleteSupplier,
  findSupplierById,
  insertSupplier,
  listSuppliersPage,
  listAllActiveSuppliers,
  mapSupplier,
  updateSupplier,
} from "../repositories/supplierRepository.js";

export class SupplierService {
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
      module: payload.module,
      before: payload.before,
      after: payload.after,
      reason: payload.reason,
      description: payload.description,
      metadata: {
        actorName: actor.name,
        actorRole: actor.role,
        ...payload.metadata,
      },
    });
  }

  async listSuppliers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const status = query.status === "ACTIVE" || query.status === "INACTIVE" ? query.status : undefined;
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listSuppliersPage(client, { search, status, tenantId, limit, offset }),
        countSuppliers(client, { search, status, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async listActiveSuppliers(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return listAllActiveSuppliers(client, actor.tenantId);
    } finally {
      client.release();
    }
  }

  async getSupplier(supplierId, actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const result = await findSupplierById(client, supplierId, actor.tenantId);
      assert(result.rowCount > 0, "Supplier not found.", 404);
      return mapSupplier(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async saveSupplier(input, actor) {
    const supplier = normalizeSupplier(input);
    assert(supplier.name, "Supplier name is required.");
    supplier.tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existingResult = await findSupplierById(client, supplier.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "Supplier not found.", 404);
        result = await updateSupplier(client, supplier);
        assert(result.rowCount > 0, "Supplier not found.", 404);

        await this.recordActivity(client, actor, {
          actionType: SUPPLIER_ACTIONS.UPDATE,
          entityType: "supplier",
          entityId: supplier.id,
          description: `${actor.name} updated supplier ${supplier.name}`,
          metadata: { name: supplier.name, status: supplier.status },
        });
      } else {
        supplier.createdById = actor.id;
        result = await insertSupplier(client, supplier);

        await this.recordActivity(client, actor, {
          actionType: SUPPLIER_ACTIONS.CREATE,
          entityType: "supplier",
          entityId: supplier.id,
          description: `${actor.name} created supplier ${supplier.name}`,
          metadata: { name: supplier.name, status: supplier.status },
        });
      }

      const fullResult = await findSupplierById(client, result.rows[0].id, actor.tenantId);
      return mapSupplier(fullResult.rows[0]);
    });
  }

  async removeSupplier(supplierId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findSupplierById(client, supplierId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Supplier not found.", 404);

      await softDeleteSupplier(client, supplierId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_ACTIONS.DELETE,
        entityType: "supplier",
        entityId: supplierId,
        reason,
        description: `${actor.name} moved supplier ${existingResult.rows[0].name} to trash${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async restoreSupplier(supplierId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreSupplier(client, supplierId, actor.tenantId);
      assert(result.rowCount > 0, "Supplier not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_ACTIONS.RESTORE,
        entityType: "supplier",
        entityId: supplierId,
        description: `${actor.name} restored supplier ${result.rows[0].name} from trash`,
      });

      return { ok: true };
    });
  }

  async permanentlyDeleteSupplier(supplierId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteSupplier(client, supplierId, actor.tenantId);
      assert(result.rowCount > 0, "Supplier not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_ACTIONS.PERMANENT_DELETE,
        entityType: "supplier",
        entityId: supplierId,
        description: `${actor.name} permanently deleted supplier ${supplierId}`,
      });

      return { ok: true };
    });
  }

  async listTrashedSuppliers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedSuppliers(client, { tenantId, limit, offset }),
        countTrashedSuppliers(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }
}
