import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createSrDueLedgerRoutes(srDueLedgerController) {
  const router = Router();
  router.use(requireFeature("sr-due-ledger"));

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), srDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.VIEW_STATE), srDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.VIEW_STATE), srDueLedgerController.balance);
  router.post("/collect", requirePermission(PERMISSIONS.MANAGE_SRS), srDueLedgerController.collect);

  return router;
}
