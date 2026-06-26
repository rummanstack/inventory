import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createEmployeesRoutes(employeeController) {
  const router = Router();

  router.use(requireFeature("employees"));

  router.get("/active", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), employeeController.listActive);
  router.get("/", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), employeeController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), employeeController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.restore);

  return router;
}
