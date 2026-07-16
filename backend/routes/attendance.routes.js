import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createAttendanceRoutes(attendanceController) {
  const router = Router();

  router.get(
    "/monthly",
    requireFeature(["attendance", "hr-reports"]),
    requireAnyPermission(PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.HR_REPORTS),
    attendanceController.monthly,
  );

  router.use(requireFeature("attendance"));

  router.get("/daily", requirePermission(PERMISSIONS.VIEW_ATTENDANCE), attendanceController.daily);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_ATTENDANCE), attendanceController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_ATTENDANCE), attendanceController.update);

  return router;
}
