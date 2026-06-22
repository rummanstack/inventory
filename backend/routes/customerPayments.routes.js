import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createCustomerPaymentsRoutes(customerPaymentController) {
  const router = Router();
  router.use(requireFeature("retailer-due-collection"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION), customerPaymentController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION), customerPaymentController.list);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION), customerPaymentController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION), customerPaymentController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION), customerPaymentController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION), customerPaymentController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_RETAIL_DUE_COLLECTION), customerPaymentController.restore);

  return router;
}
