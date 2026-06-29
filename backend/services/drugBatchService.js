import {
  mapDrugBatch,
  listDrugBatchesByProduct,
  listExpiringBatches,
} from '../repositories/drugBatchRepository.js';

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

  async listExpiring(actor, daysAhead = 90) {
    return this.databaseManager.withClient(async (client) => {
      const result = await listExpiringBatches(client, {
        tenantId: actor.tenantId,
        daysAhead: Number(daysAhead) || 90,
      });
      return { batches: result.rows.map(mapDrugBatch) };
    });
  }
}
