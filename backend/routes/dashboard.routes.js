import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDashboardRoutes(dashboardController) {
  const router = Router();
  router.use(requireFeature("dashboard"));
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), dashboardController.getDashboard);
  return router;
}
