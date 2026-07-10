import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createTradePromotionSettlementsRoutes(tradePromotionSettlementController) {
  const router = Router();
  router.use(requireFeature("trade-promotions"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionSettlementController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionSettlementController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_SETTLEMENTS), tradePromotionSettlementController.create);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_SETTLEMENTS), tradePromotionSettlementController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_SETTLEMENTS), tradePromotionSettlementController.restore);

  return router;
}
