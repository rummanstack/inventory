import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSuppliersRoutes(supplierController) {
  const router = Router();

  router.use(requireFeature("suppliers"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.listTrash);
  router.get("/active", requirePermission(PERMISSIONS.VIEW_STATE), supplierController.listActive);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), supplierController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_STATE), supplierController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), supplierController.permanentlyDelete);

  return router;
}
