import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createShopDueLedgerRoutes(shopDueLedgerController) {
  const router = Router();
  router.use(requireFeature("shop-due-ledger"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_CUSTOMERS), shopDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.VIEW_CUSTOMERS), shopDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.VIEW_CUSTOMERS), shopDueLedgerController.balance);
  router.post("/record-due", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), shopDueLedgerController.recordDue);
  router.post("/collect", requirePermission(PERMISSIONS.MANAGE_CUSTOMERS), shopDueLedgerController.collect);

  return router;
}