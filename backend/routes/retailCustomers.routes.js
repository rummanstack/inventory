import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createRetailCustomersRoutes(retailCustomerController) {
  const router = Router();

  router.get("/trash", requireFeature("retail-customers"), requirePermission(PERMISSIONS.MANAGE_RETAIL_CUSTOMERS_WRITE), retailCustomerController.listTrash);
  router.get("/active", requireFeature("retail-customers"), requirePermission(PERMISSIONS.VIEW_STATE), retailCustomerController.listActive);
  router.get("/retention", requireFeature("retail-customer-retention"), requirePermission(PERMISSIONS.VIEW_RETAIL_CUSTOMER_RETENTION), retailCustomerController.retention);
  router.get("/", requireFeature("retail-customers"), requirePermission(PERMISSIONS.VIEW_STATE), retailCustomerController.list);
  router.get("/:id", requireFeature("retail-customers"), requirePermission(PERMISSIONS.VIEW_STATE), retailCustomerController.get);
  router.post("/", requireFeature("retail-customers"), requirePermission(PERMISSIONS.MANAGE_RETAIL_CUSTOMERS_WRITE), retailCustomerController.create);
  router.put("/:id", requireFeature("retail-customers"), requirePermission(PERMISSIONS.MANAGE_RETAIL_CUSTOMERS_WRITE), retailCustomerController.update);
  router.delete("/:id", requireFeature("retail-customers"), requirePermission(PERMISSIONS.MANAGE_RETAIL_CUSTOMERS_WRITE), retailCustomerController.remove);
  router.post("/:id/restore", requireFeature("retail-customers"), requirePermission(PERMISSIONS.MANAGE_RETAIL_CUSTOMERS_WRITE), retailCustomerController.restore);
  router.delete("/:id/permanent", requireFeature("retail-customers"), requirePermission(PERMISSIONS.PERMANENT_DELETE), retailCustomerController.permanentlyDelete);

  return router;
}
