import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSrsRoutes(srController) {
  const router = Router();

  router.use(requireFeature("srs"));

  router.get("/directory", requirePermission(PERMISSIONS.VIEW_STATE), srController.directory);
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_SRS), srController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), srController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_SRS), srController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_SRS), srController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_SRS), srController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_SRS), srController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), srController.permanentlyDelete);

  return router;
}
