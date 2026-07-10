import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createTradePromotionEarningsRoutes(tradePromotionEarningController) {
  const router = Router();
  router.use(requireFeature("trade-promotions"));

  router.get("/reports/pending", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.pendingReport);
  router.get("/reports/settled", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.settledReport);
  router.get("/reports/supplier-summary", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.supplierSummaryReport);
  router.get("/reports/product-summary", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.productSummaryReport);
  router.get("/reports/date-wise", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.dateWiseReport);
  router.get("/", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.get);

  return router;
}
