import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createActivityLogsRoutes(activityLogController) {
  const router = Router();
  router.use(requireFeature(["activity-logs", "issue-center"]));

  router.get("/", requirePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS), activityLogController.list);

  return router;
}
