import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createTradePromotionRulesRoutes(tradePromotionRuleController) {
  const router = Router();
  router.use(requireFeature("trade-promotions"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_RULES), tradePromotionRuleController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionRuleController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionRuleController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_RULES), tradePromotionRuleController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_RULES), tradePromotionRuleController.update);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_RULES), tradePromotionRuleController.permanentlyDelete);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_RULES), tradePromotionRuleController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_TRADE_PROMOTION_RULES), tradePromotionRuleController.restore);

  return router;
}
