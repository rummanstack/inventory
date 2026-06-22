import { assert } from "../lib/errors.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeProductSerial } from "../lib/normalizers.js";
import { PRODUCT_SERIAL_ACTIONS } from "../lib/auditActions.js";
import {
  countProductSerials,
  countTrashedProductSerials,
  findDuplicateProductSerial,
  findProductSerialById,
  findProductSerialForUpdate,
  insertProductSerial,
  listAvailableProductSerials,
  listProductSerialsPage,
  listTrashedProductSerials,
  mapProductSerial,
  softDeleteProductSerial,
  updateProductSerial,
} from "../repositories/productSerialRepository.js";
import { findProductForUpdate } from "../repositories/productRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

export class ProductSerialService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSerials(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const filters = {
      tenantId: actor.tenantId,
      productId: String(query.productId || "").trim() || undefined,
      status: String(query.status || "").trim() || undefined,
      search: String(query.search || "").trim() || undefined,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listProductSerialsPage(client, { ...filters, limit, offset }),
        countProductSerials(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getSerial(serialId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findProductSerialById(client, serialId, actor.tenantId);
      assert(result.rowCount > 0, "Serial/IMEI record not found.", 404);
      return mapProductSerial(result.rows[0]);
    });
  }

  async listAvailable(productId, actor) {
    assert(String(productId || "").trim(), "productId is required.");

    return this.databaseManager.withClient(async (client) => ({
      serials: await listAvailableProductSerials(client, { productId, tenantId: actor.tenantId }),
    }));
  }

  async assertUnique(client, tenantId, { serialNumber, imei1, imei2 }, excludeId) {
    const duplicate = await findDuplicateProductSerial(client, { tenantId, serialNumber, imei1, imei2, excludeId });
    assert(!duplicate, "This serial/IMEI already exists in inventory.", 400);
  }

  async createSerial(input, actor) {
    const serial = normalizeProductSerial(input);
    assert(serial.productId, "Product is required.");
    assert(serial.serialNumber || serial.imei1 || serial.imei2, "Enter a serial number or IMEI.");
    serial.tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      const productResult = await findProductForUpdate(client, serial.productId, actor.tenantId);
      assert(productResult.rowCount > 0, "Product not found.", 404);

      await this.assertUnique(client, actor.tenantId, serial);

      const result = await insertProductSerial(client, serial);
      await this.recordActivity(client, actor, {
        actionType: PRODUCT_SERIAL_ACTIONS.CREATE,
        entityType: "product_serial",
        entityId: serial.id,
        description: `${actor.name} added serial/IMEI ${serial.serialNumber || serial.imei1 || serial.imei2}`,
        metadata: { productId: serial.productId },
      });

      return mapProductSerial(result.rows[0]);
    });
  }

  async updateSerial(serialId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findProductSerialForUpdate(client, serialId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Serial/IMEI record not found.", 404);
      const existing = existingResult.rows[0];

      const serial = normalizeProductSerial({ ...input, id: serialId, productId: existing.product_id });
      serial.tenantId = actor.tenantId;
      assert(serial.serialNumber || serial.imei1 || serial.imei2, "Enter a serial number or IMEI.");

      await this.assertUnique(client, actor.tenantId, serial, serialId);

      const result = await updateProductSerial(client, serial);
      await this.recordActivity(client, actor, {
        actionType: PRODUCT_SERIAL_ACTIONS.UPDATE,
        entityType: "product_serial",
        entityId: serialId,
        description: `${actor.name} updated serial/IMEI ${serial.serialNumber || serial.imei1 || serial.imei2}`,
      });

      return mapProductSerial(result.rows[0]);
    });
  }

  async removeSerial(serialId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteProductSerial(client, serialId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Serial/IMEI record not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: PRODUCT_SERIAL_ACTIONS.DELETE,
        entityType: "product_serial",
        entityId: serialId,
        description: `${actor.name} removed serial/IMEI record ${serialId}${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async listTrashed(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedProductSerials(client, { tenantId, limit, offset }),
        countTrashedProductSerials(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
