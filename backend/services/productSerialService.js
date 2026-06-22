import { assert } from "../lib/errors.js";
import { listAvailableProductSerials } from "../repositories/productSerialRepository.js";

export class ProductSerialService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listAvailable(productId, actor) {
    assert(String(productId || "").trim(), "productId is required.");

    return this.databaseManager.withClient(async (client) => ({
      serials: await listAvailableProductSerials(client, { productId, tenantId: actor.tenantId }),
    }));
  }
}
