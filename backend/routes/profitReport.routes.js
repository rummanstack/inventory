import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProfitReportRoutes(profitController) {
  const router = Router();
  router.use(requireFeature("profit"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_PROFIT_REPORT), profitController.report);

  return router;
}
