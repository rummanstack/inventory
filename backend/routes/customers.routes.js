import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createCustomersRoutes(customerController) {
  const router = Router();

  router.use(requireFeature("customers"));

  router.get(
    "/active",
    requireAnyPermission(
      PERMISSIONS.VIEW_CUSTOMERS,
      PERMISSIONS.MANAGE_CUSTOMERS,
      PERMISSIONS.CREATE_SETTLEMENTS,
      PERMISSIONS.UPDATE_SETTLEMENTS,
    ),
    customerController.listActive,
  );
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_CUSTOMERS), customerController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_CUSTOMERS), customerController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), customerController.restore);
  router.delete(
    "/:id/permanent",
    requirePermission(PERMISSIONS.PERMANENT_DELETE),
    requirePermission(PERMISSIONS.MANAGE_CUSTOMERS),
    customerController.permanentlyDelete,
  );

  return router;
}
