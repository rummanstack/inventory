import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { countStockMovements, getDamagedStockReport, getStockMovementReport, listStockMovementsPage } from "../repositories/stockMovementRepository.js";
import { STOCK_MOVEMENT_TYPE_VALUES } from "../lib/stockMovements.js";

const DATE_ERROR = "Ledger date must be in YYYY-MM-DD format.";

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  return raw ? normalizeIsoDate(raw, raw, DATE_ERROR) : "";
}

export class StockMovementService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listMovements(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const productId = String(query.productId || "").trim();
    const type = String(query.type || "").trim();
    const referenceType = String(query.referenceType || "").trim();
    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    if (type) {
      assert(STOCK_MOVEMENT_TYPE_VALUES.includes(type), "Invalid stock movement type.");
    }

    const filters = {
      tenantId: actor.tenantId,
      productId: productId || undefined,
      type: type || undefined,
      referenceType: referenceType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      if (productId) {
        const productResult = await client.query("SELECT 1 FROM products WHERE id = $1 AND tenant_id = $2 LIMIT 1", [
          productId,
          actor.tenantId,
        ]);
        assert(productResult.rowCount > 0, "Product not found.", 404);
      }

      const [items, total] = await Promise.all([
        listStockMovementsPage(client, { ...filters, limit, offset }),
        countStockMovements(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getStockMovementReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() || undefined;
    const dateTo = String(query.dateTo || "").trim() || undefined;
    const type = String(query.type || "").trim() || undefined;
    return this.databaseManager.withClient(async (client) => {
      const rows = await getStockMovementReport(client, { tenantId: actor.tenantId, dateFrom, dateTo, type });
      return { rows, dateFrom: dateFrom || null, dateTo: dateTo || null };
    });
  }

  async getDamagedStockReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() || undefined;
    const dateTo = String(query.dateTo || "").trim() || undefined;
    return this.databaseManager.withClient(async (client) => {
      const rows = await getDamagedStockReport(client, { tenantId: actor.tenantId, dateFrom, dateTo });
      return { rows, dateFrom: dateFrom || null, dateTo: dateTo || null };
    });
  }
}
