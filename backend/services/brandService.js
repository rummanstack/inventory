import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { BRAND_ACTIONS } from "../lib/auditActions.js";
import {
  deleteBrand,
  findBrandByName,
  findBrandById,
  insertBrand,
  listBrands,
  mapBrand,
  updateBrand as updateBrandRepo,
} from "../repositories/brandRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

export class BrandService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listBrands(actor) {
    return this.databaseManager.withClient((client) => listBrands(client, actor.tenantId));
  }

  async createBrand(input, actor) {
    const name = String(input.name || "").trim();
    assert(name, "Brand name is required.");

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findBrandByName(client, actor.tenantId, name);
      assert(!existing, "A brand with this name already exists.");

      const brand = { id: createId("brand"), tenantId: actor.tenantId, name };
      const result = await insertBrand(client, brand);

      await logActivity(this.auditService, client, actor, {
        actionType: BRAND_ACTIONS.CREATE,
        entityType: "brand",
        entityId: brand.id,
        description: `${actor.name} created brand ${name}`,
      });

      return mapBrand(result.rows[0]);
    });
  }

  async updateBrand(brandId, input, actor) {
    const name = String(input.name || "").trim();
    assert(name, "Brand name is required.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingBrand = await findBrandById(client, brandId, actor.tenantId);
      assert(existingBrand, "Brand not found.", 404);

      const duplicate = await findBrandByName(client, actor.tenantId, name);
      assert(!duplicate || duplicate.id === brandId, "A brand with this name already exists.");

      const result = await updateBrandRepo(client, { id: brandId, tenantId: actor.tenantId, name });

      await logActivity(this.auditService, client, actor, {
        actionType: BRAND_ACTIONS.UPDATE,
        entityType: "brand",
        entityId: brandId,
        description: `${actor.name} renamed brand ${existingBrand.name} to ${name}`,
      });

      return mapBrand(result.rows[0]);
    });
  }

  async deleteBrand(brandId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingBrand = await findBrandById(client, brandId, actor.tenantId);
      assert(existingBrand, "Brand not found.", 404);

      const [brandWithCount] = await listBrands(client, actor.tenantId).then((rows) =>
        rows.filter((row) => row.id === brandId),
      );
      assert(
        !brandWithCount?.productCount,
        "This brand is still used by products. Reassign those products before deleting it.",
      );

      await deleteBrand(client, brandId, actor.tenantId);

      await logActivity(this.auditService, client, actor, {
        actionType: BRAND_ACTIONS.DELETE,
        entityType: "brand",
        entityId: brandId,
        description: `${actor.name} deleted brand ${existingBrand.name}`,
      });

      return { ok: true };
    });
  }
}
