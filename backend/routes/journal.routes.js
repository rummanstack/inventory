import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createJournalRoutes(journalController) {
  const router = Router();
  router.use(requireFeature("general-ledger"));

  router.get("/accounts", requirePermission(PERMISSIONS.VIEW_GENERAL_LEDGER), journalController.chartOfAccounts);
  router.get("/general-ledger", requirePermission(PERMISSIONS.VIEW_GENERAL_LEDGER), journalController.generalLedger);
  router.get("/trial-balance", requirePermission(PERMISSIONS.VIEW_GENERAL_LEDGER), journalController.trialBalance);
  router.get("/balance-sheet", requirePermission(PERMISSIONS.VIEW_GENERAL_LEDGER), journalController.balanceSheet);
  router.get("/profit-and-loss", requirePermission(PERMISSIONS.VIEW_GENERAL_LEDGER), journalController.profitAndLoss);

  return router;
}
