import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createRetailCustomersRoutes(retailCustomerController) {
  const router = Router();

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCustomerController.listTrash);
  router.get("/active", requirePermission(PERMISSIONS.VIEW_STATE), retailCustomerController.listActive);
  router.get("/retention", requirePermission(PERMISSIONS.VIEW_STATE), retailCustomerController.retention);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), retailCustomerController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_STATE), retailCustomerController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCustomerController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCustomerController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCustomerController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_RETAILERS), retailCustomerController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), retailCustomerController.permanentlyDelete);

  return router;
}
