import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDepartmentsRoutes(departmentController) {
  const router = Router();

  router.use(requireFeature("departments"));

  router.get("/active", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.listActive);
  router.get("/", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.list);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DEPARTMENTS), departmentController.remove);

  return router;
}
