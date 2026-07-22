import { assert } from "../lib/errors.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeProductSerial } from "../lib/normalizers.js";
import { PRODUCT_SERIAL_ACTIONS } from "../lib/auditActions.js";
import { generateUniqueSerialBarcode } from "../lib/productSerials.js";
import {
  countProductSerials,
  countTrashedProductSerials,
  findDuplicateProductSerial,
  findProductSerialByBarcode,
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

// Assigns a barcode to a serial that wasn't given one, retrying on the rare
// collision with another unit's barcode already in this tenant.
async function assignBarcodeIfMissing(client, tenantId, serial) {
  if (serial.barcode) return;

  const barcode = await generateUniqueSerialBarcode((candidate) =>
    findDuplicateProductSerial(client, { tenantId, barcode: candidate }),
  );
  assert(barcode, "Could not generate a unique barcode. Please try again.");
  serial.barcode = barcode;
}

function isSerialRequired(product) {
  return product?.serial_required === true || product?.serial_required === "t";
}

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

  async assertUnique(client, tenantId, { serialNumber, imei1, imei2, barcode }, excludeId) {
    const duplicate = await findDuplicateProductSerial(client, { tenantId, serialNumber, imei1, imei2, barcode, excludeId });
    assert(!duplicate, "This serial/IMEI or barcode already exists in inventory.", 400);
  }

  async createSerial(input, actor) {
    const serial = normalizeProductSerial(input);
    assert(serial.productId, "Product is required.");
    assert(serial.serialNumber || serial.imei1 || serial.imei2, "Enter a serial number or IMEI.");
    serial.tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      const productResult = await findProductForUpdate(client, serial.productId, actor.tenantId);
      assert(productResult.rowCount > 0, "Product not found.", 404);
      assert(isSerialRequired(productResult.rows[0]), "This product is not marked as serial/IMEI required.", 400);

      await this.assertUnique(client, actor.tenantId, serial);
      await assignBarcodeIfMissing(client, actor.tenantId, serial);

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

  // POS/sales-invoice barcode scanner: resolve a scanned code straight to the
  // exact unit. Returns null (not a 404) so callers can fall back to a normal
  // product-barcode lookup without a try/catch — a miss here just means the
  // scanned code wasn't a serial barcode.
  async findByBarcode(barcode, actor) {
    const cleanBarcode = String(barcode || "").trim();
    if (!cleanBarcode) return null;

    return this.databaseManager.withClient(async (client) => {
      const result = await findProductSerialByBarcode(client, cleanBarcode, actor.tenantId);
      return result.rowCount > 0 ? mapProductSerial(result.rows[0]) : null;
    });
  }

  // Bulk-creates IN_STOCK serials for one product in a single transaction — the
  // CSV-import path. Each row may carry its own barcode/purchasePrice/salePrice;
  // a missing barcode is auto-generated exactly like a single manual add. Fails
  // the whole batch on the first bad/duplicate row rather than partially
  // importing, so a re-upload after fixing the CSV can't create partial dupes.
  async bulkImport(input, actor) {
    const productId = String(input.productId || "").trim();
    assert(productId, "Product is required.");
    const rows = Array.isArray(input.rows) ? input.rows : [];
    assert(rows.length > 0, "No rows to import.");
    assert(rows.length <= 500, "Import is limited to 500 rows at a time.");

    return this.databaseManager.withTransaction(async (client) => {
      const productResult = await findProductForUpdate(client, productId, actor.tenantId);
      assert(productResult.rowCount > 0, "Product not found.", 404);
      assert(isSerialRequired(productResult.rows[0]), "This product is not marked as serial/IMEI required.", 400);

      const seen = new Set();
      const created = [];
      for (const row of rows) {
        const serial = normalizeProductSerial({ ...row, productId });
        assert(serial.serialNumber || serial.imei1 || serial.imei2, "Every row needs a serial number or IMEI.");

        const dedupeKey = serial.serialNumber || serial.imei1 || serial.imei2;
        assert(!seen.has(dedupeKey), `"${dedupeKey}" appears more than once in this import.`);
        seen.add(dedupeKey);

        serial.tenantId = actor.tenantId;
        await this.assertUnique(client, actor.tenantId, serial);
        await assignBarcodeIfMissing(client, actor.tenantId, serial);

        const result = await insertProductSerial(client, serial);
        created.push(mapProductSerial(result.rows[0]));
      }

      await this.recordActivity(client, actor, {
        actionType: PRODUCT_SERIAL_ACTIONS.CREATE,
        entityType: "product_serial",
        entityId: productId,
        description: `${actor.name} bulk-imported ${created.length} serial/IMEI record(s) for ${productResult.rows[0].name}`,
        metadata: { productId, count: created.length },
      });

      return { items: created, count: created.length };
    });
  }
}
