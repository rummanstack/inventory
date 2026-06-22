import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProductSerialsRoutes(productSerialController) {
  const router = Router();

  // Sale-time lookup (Quick Sale / Sales Invoice serial picker) — unchanged from when this
  // was first added: gated by the broader "products" feature + view_state, not the dedicated
  // product-serials permission/feature below, which is for the standalone management page.
  router.get("/available", requireFeature("products"), requirePermission(PERMISSIONS.VIEW_STATE), productSerialController.listAvailable);

  router.use(requireFeature("product-serials"));
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_PRODUCT_SERIALS), productSerialController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_PRODUCT_SERIALS), productSerialController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.create);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCT_SERIALS), productSerialController.remove);

  return router;
}
