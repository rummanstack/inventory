import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDepartmentsRoutes(departmentController) {
  const router = Router();

  router.get(
    "/active",
    requireFeature(["departments", "hr-reports"]),
    requireAnyPermission(PERMISSIONS.MANAGE_DEPARTMENTS, PERMISSIONS.HR_REPORTS),
    departmentController.listActive,
  );
  router.get(
    "/",
    requireFeature(["departments", "hr-reports"]),
    requireAnyPermission(PERMISSIONS.MANAGE_DEPARTMENTS, PERMISSIONS.HR_REPORTS),
    departmentController.list,
  );

  router.use(requireFeature("departments"));
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.remove);

  return router;
}
