import {
  mapDrugBatch,
  listDrugBatchesByProduct,
  listBatchSalesReport,
  countBatchSalesReport,
} from '../repositories/drugBatchRepository.js';
import { parsePagination, buildPageResult } from '../lib/pagination.js';
import { normalizeIsoDate } from '../lib/dateRanges.js';

export class DrugBatchService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listByProduct(productId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await listDrugBatchesByProduct(client, {
        tenantId: actor.tenantId,
        productId,
        activeOnly: false,
      });
      return { batches: result.rows.map(mapDrugBatch) };
    });
  }


  async batchSalesReport(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const DATE_ERROR = 'Date must be in YYYY-MM-DD format.';
    const dateFrom = String(query.dateFrom || '').trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || '').trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;

    const filters = {
      tenantId: actor.tenantId,
      dateFrom,
      dateTo,
      batchNumber: String(query.batchNumber || '').trim() || undefined,
      productId: String(query.productId || '').trim() || undefined,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listBatchSalesReport(client, { ...filters, limit, offset }),
        countBatchSalesReport(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
