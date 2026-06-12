import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createDsrDueLedgerRoutes(dsrDueLedgerController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.list);
  router.get("/statement", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.statement);
  router.get("/balance", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.balance);
  router.post("/settle", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrDueLedgerController.settle);

  return router;
}
