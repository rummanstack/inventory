import { Router } from "express";
import { requirePermission, requireAnyPermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

const ALL_ACCOUNTING_FEATURES = ["general-ledger", "trial-balance", "balance-sheet", "profit-and-loss"];

export function createJournalRoutes(journalController) {
  const router = Router();

  // Chart of accounts is shared reference data for all four reports — any one
  // of the four features/permissions is enough to read it (requireFeature
  // already accepts an array and OR-matches against it).
  router.get(
    "/accounts",
    requireFeature(ALL_ACCOUNTING_FEATURES),
    requireAnyPermission(
      PERMISSIONS.VIEW_GENERAL_LEDGER,
      PERMISSIONS.VIEW_TRIAL_BALANCE,
      PERMISSIONS.VIEW_BALANCE_SHEET,
      PERMISSIONS.VIEW_PROFIT_AND_LOSS,
    ),
    journalController.chartOfAccounts,
  );
  router.get(
    "/general-ledger",
    requireFeature("general-ledger"),
    requirePermission(PERMISSIONS.VIEW_GENERAL_LEDGER),
    journalController.generalLedger,
  );
  router.get(
    "/trial-balance",
    requireFeature("trial-balance"),
    requirePermission(PERMISSIONS.VIEW_TRIAL_BALANCE),
    journalController.trialBalance,
  );
  router.get(
    "/balance-sheet",
    requireFeature("balance-sheet"),
    requirePermission(PERMISSIONS.VIEW_BALANCE_SHEET),
    journalController.balanceSheet,
  );
  router.get(
    "/profit-and-loss",
    requireFeature("profit-and-loss"),
    requirePermission(PERMISSIONS.VIEW_PROFIT_AND_LOSS),
    journalController.profitAndLoss,
  );

  return router;
}
