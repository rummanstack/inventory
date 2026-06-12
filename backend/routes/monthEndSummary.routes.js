import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createMonthEndSummaryRoutes(monthEndSummaryController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), monthEndSummaryController.getSummary);

  return router;
}
