import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createTradePromotionEarningsRoutes(tradePromotionEarningController) {
  const router = Router();

  router.get("/reports/pending", requireFeature("trade-promotion-reports"), requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.pendingReport);
  router.get("/reports/settled", requireFeature("trade-promotion-reports"), requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.settledReport);
  router.get("/reports/supplier-summary", requireFeature("trade-promotion-reports"), requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.supplierSummaryReport);
  router.get("/reports/product-summary", requireFeature("trade-promotion-reports"), requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.productSummaryReport);
  router.get("/reports/date-wise", requireFeature("trade-promotion-reports"), requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.dateWiseReport);
  router.get("/", requireFeature("trade-promotion-earnings"), requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.list);
  router.get("/:id", requireFeature("trade-promotion-earnings"), requirePermission(PERMISSIONS.VIEW_TRADE_PROMOTIONS), tradePromotionEarningController.get);

  return router;
}
