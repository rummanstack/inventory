import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSupplierDiscountsRoutes(supplierDiscountController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), supplierDiscountController.list);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_SUPPLIER_PAYMENTS), supplierDiscountController.remove);

  return router;
}
