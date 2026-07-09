import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createAttendanceRoutes(attendanceController) {
  const router = Router();

  router.use(requireFeature("attendance"));

  router.get("/daily", requirePermission(PERMISSIONS.VIEW_ATTENDANCE), attendanceController.daily);
  router.get("/monthly", requirePermission(PERMISSIONS.VIEW_ATTENDANCE), attendanceController.monthly);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_ATTENDANCE), attendanceController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_ATTENDANCE), attendanceController.update);

  return router;
}
