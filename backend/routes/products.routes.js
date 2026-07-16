import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProductsRoutes(productController) {
  const router = Router();
  router.use(requireFeature("products"));

  router.get(
    "/directory",
    requireAnyPermission(
      PERMISSIONS.VIEW_PRODUCTS,
      PERMISSIONS.MANAGE_PRODUCTS,
      PERMISSIONS.CREATE_ISSUES,
      PERMISSIONS.UPDATE_ISSUES,
      PERMISSIONS.CREATE_SETTLEMENTS,
      PERMISSIONS.UPDATE_SETTLEMENTS,
      PERMISSIONS.MANAGE_RETAIL_QUICK_SALE,
      PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES,
      PERMISSIONS.MANAGE_RETAIL_SALES_RETURNS,
      PERMISSIONS.MANAGE_RETAIL_PROMOTIONS,
      PERMISSIONS.MANAGE_PURCHASES,
      PERMISSIONS.VIEW_PRODUCT_SERIALS,
      PERMISSIONS.MANAGE_PRODUCT_SERIALS,
      PERMISSIONS.VIEW_WARRANTY_CLAIMS,
      PERMISSIONS.MANAGE_WARRANTY_CLAIMS,
      PERMISSIONS.VIEW_QUOTATIONS,
      PERMISSIONS.MANAGE_QUOTATIONS,
      PERMISSIONS.VIEW_TRADE_INS,
      PERMISSIONS.MANAGE_TRADE_INS,
      PERMISSIONS.MANAGE_BATCH_TRACKING,
    ),
    productController.directory,
  );
  router.get("/low-stock", requireFeature("low-stock-alerts"), requirePermission(PERMISSIONS.VIEW_PRODUCTS), productController.lowStock);
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_PRODUCTS), productController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.remove);
  router.post("/:id/stock", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.addStock);
  router.post("/:id/opening-stock", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.setOpeningStock);
  router.post("/:id/clear-damage", requireFeature("damaged-stock"), requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.clearDamage);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.restore);
  router.delete(
    "/:id/permanent",
    requirePermission(PERMISSIONS.PERMANENT_DELETE),
    requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
    productController.permanentlyDelete,
  );

  return router;
}
