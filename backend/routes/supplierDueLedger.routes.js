import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSupplierDueLedgerRoutes(supplierDueLedgerController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), supplierDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.VIEW_STATE), supplierDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.VIEW_STATE), supplierDueLedgerController.balance);

  return router;
}
