import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProfitReportRoutes(profitController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), profitController.report);

  return router;
}
