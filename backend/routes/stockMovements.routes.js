import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createStockMovementsRoutes(stockMovementController) {
  const router = Router();
  router.use(requireFeature("stock-movement"));

  router.get("/reports", requireFeature("stock-movement-report"), requirePermission(PERMISSIONS.VIEW_STATE), stockMovementController.stockMovementReport);
  router.get("/damaged-report", requireFeature("damaged-stock-report"), requirePermission(PERMISSIONS.VIEW_STATE), stockMovementController.damagedStockReport);
  router.get("/", requirePermission(PERMISSIONS.VIEW_PRODUCTS), stockMovementController.list);

  return router;
}