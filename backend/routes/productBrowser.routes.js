import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createProductBrowserRoutes(productBrowserController) {
  const router = Router();
  router.use(requireFeature("product-browser"));
  router.use(requirePermission(PERMISSIONS.VIEW_PRODUCT_BROWSER));

  router.get("/products", productBrowserController.list);
  router.get("/products/:id", productBrowserController.get);
  router.get("/categories", productBrowserController.listCategories);
  router.get("/categories/:id/attributes", productBrowserController.listCategoryAttributes);

  return router;
}
