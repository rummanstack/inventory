import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createStockMovementsRoutes(stockMovementController) {
  const router = Router();
  router.use(requireFeature("stock-movement"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), stockMovementController.list);

  return router;
}
