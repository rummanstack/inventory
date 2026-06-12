import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createActivityLogsRoutes(activityLogController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS), activityLogController.list);

  return router;
}
