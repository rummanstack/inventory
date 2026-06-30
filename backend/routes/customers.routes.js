import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createCustomersRoutes(customerController) {
  const router = Router();

  router.use(requireFeature("customers"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.listTrash);
  router.get("/active", requirePermission(PERMISSIONS.VIEW_STATE), customerController.listActive);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), customerController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_STATE), customerController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), customerController.permanentlyDelete);

  return router;
}
