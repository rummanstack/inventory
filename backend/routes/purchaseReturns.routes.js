import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createPurchaseReturnsRoutes(purchaseReturnController) {
  const router = Router();
  router.use(requireFeature("purchase-returns"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_PURCHASE_RETURNS), purchaseReturnController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_PURCHASE_RETURNS), purchaseReturnController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PURCHASE_RETURNS), purchaseReturnController.create);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PURCHASE_RETURNS), purchaseReturnController.remove);

  return router;
}
