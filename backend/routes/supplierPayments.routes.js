import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSupplierPaymentsRoutes(supplierPaymentController) {
  const router = Router();

  router.get("/reports", requireFeature("supplier-payment-report"), requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierPaymentController.supplierPaymentReport);
  router.use(requireFeature("supplier-payments"));
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierPaymentController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_SUPPLIER_PAYMENTS), supplierPaymentController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_SUPPLIER_PAYMENTS), supplierPaymentController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierPaymentController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierPaymentController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierPaymentController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierPaymentController.restore);

  return router;
}
