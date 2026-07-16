import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createLeaveRoutes(leaveController) {
  const router = Router();

  router.get(
    "/report",
    requireFeature(["leave_management", "hr-reports"]),
    requireAnyPermission(PERMISSIONS.MANAGE_LEAVE, PERMISSIONS.HR_REPORTS),
    leaveController.report,
  );

  router.use(requireFeature("leave_management"));

  router.get("/types/active", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.listActiveTypes);
  router.get("/types", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.listTypes);
  router.post("/types", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.createType);
  router.put("/types/:id", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.updateType);
  router.delete("/types/:id", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.deleteType);

  router.get("/calendar", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.calendar);
  router.get("/requests", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.listRequests);
  router.get("/requests/:id", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.getRequest);
  router.post("/requests", requirePermission(PERMISSIONS.MANAGE_LEAVE), leaveController.apply);
  router.post("/requests/:id/approve", requirePermission(PERMISSIONS.APPROVE_LEAVE), leaveController.approve);
  router.post("/requests/:id/reject", requirePermission(PERMISSIONS.APPROVE_LEAVE), leaveController.reject);

  return router;
}
