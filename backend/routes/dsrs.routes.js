import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrsRoutes(dsrController) {
  const router = Router();

  router.use(requireFeature("dsrs"));

  router.get(
    "/directory",
    requireAnyPermission(
      PERMISSIONS.VIEW_DSRS,
      PERMISSIONS.MANAGE_DSRS,
      PERMISSIONS.CREATE_ISSUES,
      PERMISSIONS.UPDATE_ISSUES,
      PERMISSIONS.CREATE_SETTLEMENTS,
      PERMISSIONS.UPDATE_SETTLEMENTS,
      PERMISSIONS.MANAGE_CUSTOMERS,
      PERMISSIONS.MANAGE_DSR_FINANCE,
    ),
    dsrController.directory,
  );
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_DSRS), dsrController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), dsrController.permanentlyDelete);

  return router;
}