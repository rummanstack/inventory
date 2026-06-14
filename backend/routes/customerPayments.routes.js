import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createCustomerPaymentsRoutes(customerPaymentController) {
  const router = Router();

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerPaymentController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerPaymentController.list);
  router.get("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerPaymentController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerPaymentController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerPaymentController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerPaymentController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerPaymentController.restore);

  return router;
}
