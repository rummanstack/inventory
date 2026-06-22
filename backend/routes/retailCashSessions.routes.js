import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createRetailCashSessionsRoutes(retailCashSessionController) {
  const router = Router();
  router.use(requireFeature("retailer-quick-sale"));

  router.get("/current", requirePermission(PERMISSIONS.MANAGE_RETAIL_QUICK_SALE), retailCashSessionController.getCurrentSession);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAIL_QUICK_SALE), retailCashSessionController.startSession);
  router.post("/:id/stop", requirePermission(PERMISSIONS.MANAGE_RETAIL_QUICK_SALE), retailCashSessionController.stopSession);

  return router;
}
