import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDrugBatchesRoutes(drugBatchController) {
  const router = Router();

  // Used inline by the Sales Invoice form's FEFO display, not its own page.
  router.get("/product/:productId", requireFeature("retailer-sales-invoices"), requirePermission(PERMISSIONS.VIEW_EXPIRY_ALERTS), drugBatchController.listByProduct);
  router.get("/batch-sales-report", requireFeature("batch-sales-report"), requirePermission(PERMISSIONS.MANAGE_BATCH_TRACKING), drugBatchController.listBatchSalesReport);
  router.get("/expiry-alerts", requireFeature("expiry-alerts"), requirePermission(PERMISSIONS.VIEW_EXPIRY_ALERTS), drugBatchController.listExpiryAlerts);

  return router;
}
