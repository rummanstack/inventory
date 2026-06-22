import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSupplierDueLedgerRoutes(supplierDueLedgerController) {
  const router = Router();
  router.use(requireFeature("supplier-statement"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_SUPPLIER_STATEMENT), supplierDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.VIEW_SUPPLIER_STATEMENT), supplierDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.VIEW_SUPPLIER_STATEMENT), supplierDueLedgerController.balance);

  return router;
}
