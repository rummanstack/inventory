import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrDashboardRoutes(dsrDashboardController) {
  const router = Router();

  router.use(requireFeature("dsrs"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), dsrDashboardController.getDashboard);

  return router;
}
