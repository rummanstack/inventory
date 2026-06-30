import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrDueLedgerRoutes(dsrDueLedgerController) {
  const router = Router();

  // /balances is a reporting endpoint — dues accumulate from settlements regardless
  // of whether the dsr-finance feature is enabled, so don't gate it.
  router.get("/balances", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.balances);

  router.use(requireFeature("dsr-finance"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.balance);
  router.post("/settle", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrDueLedgerController.settle);

  return router;
}
