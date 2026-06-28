import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createPurchaseReceiveRoutes(purchaseReceiveController) {
  const router = Router();

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_PURCHASES), purchaseReceiveController.listTrash);
  router.get("/reports", requireFeature("purchase-report"), requirePermission(PERMISSIONS.MANAGE_PURCHASES), purchaseReceiveController.purchaseReport);
  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), purchaseReceiveController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_STATE), purchaseReceiveController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_PURCHASES), purchaseReceiveController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_PURCHASES), purchaseReceiveController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_PURCHASES), purchaseReceiveController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_PURCHASES), purchaseReceiveController.restore);

  return router;
}
