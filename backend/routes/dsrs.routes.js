import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrsRoutes(dsrController) {
  const router = Router();

  router.use(requireFeature("dsrs"));

  router.get("/directory", requirePermission(PERMISSIONS.VIEW_STATE), dsrController.directory);
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), dsrController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), dsrController.permanentlyDelete);

  return router;
}
