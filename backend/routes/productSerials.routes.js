import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProductSerialsRoutes(productSerialController) {
  const router = Router();

  // Sale-time lookup (Quick Sale / Sales Invoice serial picker) stays tied to
  // broader product-reading access rather than the standalone serial-management page.
  router.get(
    "/available",
    requireFeature("products"),
    requireAnyPermission(
      PERMISSIONS.VIEW_PRODUCTS,
      PERMISSIONS.MANAGE_PRODUCTS,
      PERMISSIONS.MANAGE_RETAIL_QUICK_SALE,
      PERMISSIONS.VIEW_RETAIL_SALES_INVOICES,
      PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES,
      PERMISSIONS.VIEW_RETAIL_SALES_RETURNS,
      PERMISSIONS.MANAGE_RETAIL_SALES_RETURNS,
      PERMISSIONS.VIEW_WARRANTY_CLAIMS,
      PERMISSIONS.MANAGE_WARRANTY_CLAIMS,
    ),
    productSerialController.listAvailable,
  );

  router.use(requireFeature("product-serials"));
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_PRODUCT_SERIALS), productSerialController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_PRODUCT_SERIALS), productSerialController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.remove);

  return router;
}