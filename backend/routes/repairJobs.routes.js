import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createRepairJobsRoutes(repairJobController) {
  const router = Router();
  router.use(requireFeature("repair-jobs"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_REPAIR_JOBS), repairJobController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_REPAIR_JOBS), repairJobController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_REPAIR_JOBS), repairJobController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_REPAIR_JOBS), repairJobController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_REPAIR_JOBS), repairJobController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_REPAIR_JOBS), repairJobController.remove);

  return router;
}
