import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDesignationsRoutes(designationController) {
  const router = Router();

  router.use(requireFeature("designations"));

  router.get("/active", requirePermission(PERMISSIONS.MANAGE_DESIGNATIONS), designationController.listActive);
  router.get("/", requirePermission(PERMISSIONS.MANAGE_DESIGNATIONS), designationController.list);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_DESIGNATIONS), designationController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DESIGNATIONS), designationController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_DESIGNATIONS), designationController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DESIGNATIONS), designationController.remove);

  return router;
}
