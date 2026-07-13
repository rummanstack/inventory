import { Router } from "express";
import { PERMISSIONS } from "../lib/permissions.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";

export function createAiInsightsRoutes(aiInsightController) {
  const router = Router();

  router.get("/status", requireAnyPermission(PERMISSIONS.VIEW_RETAIL_CUSTOMERS, PERMISSIONS.VIEW_PRODUCTS), aiInsightController.status);
  router.post("/chat", requireAnyPermission(PERMISSIONS.VIEW_RETAIL_CUSTOMERS, PERMISSIONS.VIEW_PRODUCTS), aiInsightController.chat);
  router.post("/customers/:customerId/insight", requireFeature("retail-customers"), requirePermission(PERMISSIONS.VIEW_RETAIL_CUSTOMERS), aiInsightController.customerInsight);
  router.post("/low-stock/advice", requireFeature("low-stock-alerts"), requirePermission(PERMISSIONS.VIEW_PRODUCTS), aiInsightController.lowStockAdvice);

  return router;
}
