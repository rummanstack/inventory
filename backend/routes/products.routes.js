import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProductsRoutes(productController) {
  const router = Router();

  router.get("/directory", requirePermission(PERMISSIONS.VIEW_STATE), productController.directory);
  router.get("/low-stock", requirePermission(PERMISSIONS.VIEW_STATE), productController.lowStock);
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), productController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.remove);
  router.post("/:id/stock", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.addStock);
  router.post("/:id/opening-stock", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.setOpeningStock);
  router.post("/:id/clear-damage", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.clearDamage);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), productController.permanentlyDelete);

  return router;
}
