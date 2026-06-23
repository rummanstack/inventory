import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProfitReportRoutes(profitController) {
  const router = Router();
  router.use(requireFeature("profit"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PROFIT_REPORT), profitController.report);
  router.get("/by-dsr", requirePermission(PERMISSIONS.MANAGE_PROFIT_REPORT), profitController.byDsr);
  router.get("/by-product", requirePermission(PERMISSIONS.MANAGE_PROFIT_REPORT), profitController.byProduct);
  router.get("/by-category", requirePermission(PERMISSIONS.MANAGE_PROFIT_REPORT), profitController.byCategory);
  router.get("/by-customer", requirePermission(PERMISSIONS.MANAGE_PROFIT_REPORT), profitController.byCustomer);

  return router;
}
