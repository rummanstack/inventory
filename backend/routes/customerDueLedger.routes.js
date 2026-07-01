import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createCustomerDueLedgerRoutes(customerDueLedgerController) {
  const router = Router();
  router.use(requireFeature("retailer-customer-due"));

  router.get("/due-report", requireFeature("customer-due-report"), requirePermission(PERMISSIONS.MANAGE_RETAIL_CUSTOMER_DUE), customerDueLedgerController.customerDueReport);
  router.get("/", requirePermission(PERMISSIONS.VIEW_RETAIL_CUSTOMER_DUE), customerDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.VIEW_RETAIL_CUSTOMER_DUE), customerDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.VIEW_RETAIL_CUSTOMER_DUE), customerDueLedgerController.balance);

  return router;
}