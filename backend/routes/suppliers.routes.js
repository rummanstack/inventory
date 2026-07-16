import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSuppliersRoutes(supplierController) {
  const router = Router();

  router.use(requireFeature("suppliers"));

  router.get(
    "/active",
    requireAnyPermission(
      PERMISSIONS.VIEW_SUPPLIERS,
      PERMISSIONS.MANAGE_SUPPLIERS,
      PERMISSIONS.VIEW_PURCHASES,
      PERMISSIONS.MANAGE_PURCHASES,
      PERMISSIONS.VIEW_SUPPLIER_PAYMENTS,
      PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS,
      PERMISSIONS.VIEW_SUPPLIER_STATEMENT,
      PERMISSIONS.VIEW_WARRANTY_CLAIMS,
      PERMISSIONS.MANAGE_WARRANTY_CLAIMS,
      PERMISSIONS.CREATE_SETTLEMENTS,
      PERMISSIONS.UPDATE_SETTLEMENTS,
    ),
    supplierController.listActive,
  );
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_SUPPLIERS), supplierController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_SUPPLIERS), supplierController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_SUPPLIERS), supplierController.restore);
  router.delete(
    "/:id/permanent",
    requirePermission(PERMISSIONS.PERMANENT_DELETE),
    requirePermission(PERMISSIONS.MANAGE_SUPPLIERS),
    supplierController.permanentlyDelete,
  );

  return router;
}
