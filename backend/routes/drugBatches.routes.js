import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDrugBatchesRoutes(drugBatchController) {
  const router = Router();
  router.use(requireFeature("batch-tracking"));

  router.get("/product/:productId", requirePermission(PERMISSIONS.VIEW_EXPIRY_ALERTS), drugBatchController.listByProduct);
  router.get("/batch-sales-report", requirePermission(PERMISSIONS.MANAGE_BATCH_TRACKING), drugBatchController.listBatchSalesReport);

  return router;
}
