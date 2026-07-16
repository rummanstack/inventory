import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSupplierDiscountsRoutes(supplierDiscountController) {
  const router = Router();

  router.use(requireFeature("supplier-discounts"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_SUPPLIER_PAYMENTS), supplierDiscountController.list);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierDiscountController.remove);

  return router;
}
