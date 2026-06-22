import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSalesReturnsRoutes(salesReturnController) {
  const router = Router();
  router.use(requireFeature("retailer-sales-return"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_RETURNS), salesReturnController.list);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_RETURNS), salesReturnController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAIL_SALES_RETURNS), salesReturnController.create);

  return router;
}
