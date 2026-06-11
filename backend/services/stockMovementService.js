import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { countStockMovements, listStockMovementsPage } from "../repositories/stockMovementRepository.js";

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
    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const filters = {
      tenantId: actor.tenantId,
      productId: productId || undefined,
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
}
