import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { PROMOTION_ACTIONS } from "../lib/auditActions.js";
import { normalizeRetailPromotion } from "../lib/normalizers.js";
import {
  deleteRetailPromotion,
  findRetailPromotionById,
  insertRetailPromotion,
  listActiveRetailPromotionsForDate,
  listRetailPromotions,
  mapRetailPromotion,
  updateRetailPromotion as updateRetailPromotionRepo,
} from "../repositories/retailPromotionRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

export class RetailPromotionService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listRetailPromotions(actor) {
    return this.databaseManager.withClient((client) => listRetailPromotions(client, actor.tenantId));
  }

  async listActivePromotionsForDate(actor, invoiceDate) {
    return this.databaseManager.withClient((client) =>
      listActiveRetailPromotionsForDate(client, actor.tenantId, invoiceDate),
    );
  }

  async createRetailPromotion(input, actor) {
    const promotion = normalizeRetailPromotion(input);
    assert(promotion.name, "Promotion name is required.");
    assert(promotion.discountValue > 0, "Promotion discount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const record = {
        ...promotion,
        id: createId("promo"),
        tenantId: actor.tenantId,
      };
      const result = await insertRetailPromotion(client, record);

      await logActivity(this.auditService, client, actor, {
        actionType: PROMOTION_ACTIONS.CREATE,
        entityType: "retail_promotion",
        entityId: record.id,
        description: `${actor.name} created promotion ${record.name}`,
      });

      return mapRetailPromotion(result.rows[0]);
    });
  }

  async updateRetailPromotion(promotionId, input, actor) {
    const promotion = normalizeRetailPromotion({ ...input, id: promotionId });
    assert(promotion.name, "Promotion name is required.");
    assert(promotion.discountValue > 0, "Promotion discount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findRetailPromotionById(client, promotionId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Promotion not found.", 404);
      const existing = existingResult.rows[0];
      const result = await updateRetailPromotionRepo(client, {
        ...promotion,
        id: promotionId,
        tenantId: actor.tenantId,
      });

      await logActivity(this.auditService, client, actor, {
        actionType: PROMOTION_ACTIONS.UPDATE,
        entityType: "retail_promotion",
        entityId: promotionId,
        description: `${actor.name} updated promotion ${existing.name} to ${promotion.name}`,
      });

      return mapRetailPromotion(result.rows[0]);
    });
  }

  async deleteRetailPromotion(promotionId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findRetailPromotionById(client, promotionId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Promotion not found.", 404);
      const existing = existingResult.rows[0];
      await deleteRetailPromotion(client, promotionId, actor.tenantId);

      await logActivity(this.auditService, client, actor, {
        actionType: PROMOTION_ACTIONS.DELETE,
        entityType: "retail_promotion",
        entityId: promotionId,
        description: `${actor.name} deleted promotion ${existing.name}`,
      });

      return { ok: true };
    });
  }
}
