import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createStockMovementsRoutes(stockMovementController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), stockMovementController.list);

  return router;
}
