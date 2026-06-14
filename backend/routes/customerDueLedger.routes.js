import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createCustomerDueLedgerRoutes(customerDueLedgerController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.MANAGE_RETAILERS), customerDueLedgerController.balance);

  return router;
}
