import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createFinancialReportingRoutes(controller) {
  const router = Router();

  router.get(
    "/reference-data",
    requireFeature(["trial-balance", "general-ledger", "account-ledger", "customer-ledger", "supplier-ledger", "cash-book", "bank-book", "profit-and-loss", "balance-sheet", "cash-flow"]),
    requireAnyPermission(
      PERMISSIONS.VIEW_TRIAL_BALANCE,
      PERMISSIONS.VIEW_GENERAL_LEDGER,
      PERMISSIONS.VIEW_BALANCE_SHEET,
      PERMISSIONS.VIEW_PROFIT_AND_LOSS,
      PERMISSIONS.REPORT_TRIAL_BALANCE,
      PERMISSIONS.REPORT_GENERAL_LEDGER,
      PERMISSIONS.REPORT_ACCOUNT_LEDGER,
      PERMISSIONS.REPORT_CUSTOMER_LEDGER,
      PERMISSIONS.REPORT_SUPPLIER_LEDGER,
      PERMISSIONS.REPORT_CASH_BOOK,
      PERMISSIONS.REPORT_BANK_BOOK,
      PERMISSIONS.REPORT_BALANCE_SHEET,
      PERMISSIONS.REPORT_PROFIT_LOSS,
      PERMISSIONS.REPORT_CASH_FLOW,
    ),
    controller.referenceData,
  );

  router.get("/trial-balance", requireFeature("trial-balance"), requireAnyPermission(PERMISSIONS.VIEW_TRIAL_BALANCE, PERMISSIONS.REPORT_TRIAL_BALANCE), controller.trialBalance);
  router.get("/general-ledger", requireFeature("general-ledger"), requireAnyPermission(PERMISSIONS.VIEW_GENERAL_LEDGER, PERMISSIONS.REPORT_GENERAL_LEDGER), controller.generalLedger);
  router.get("/account-ledger", requireFeature("account-ledger"), requirePermission(PERMISSIONS.REPORT_ACCOUNT_LEDGER), controller.accountLedger);
  router.get("/customer-ledger", requireFeature("customer-ledger"), requirePermission(PERMISSIONS.REPORT_CUSTOMER_LEDGER), controller.customerLedger);
  router.get("/supplier-ledger", requireFeature("supplier-ledger"), requirePermission(PERMISSIONS.REPORT_SUPPLIER_LEDGER), controller.supplierLedger);
  router.get("/cash-book", requireFeature("cash-book"), requirePermission(PERMISSIONS.REPORT_CASH_BOOK), controller.cashBook);
  router.get("/bank-book", requireFeature("bank-book"), requirePermission(PERMISSIONS.REPORT_BANK_BOOK), controller.bankBook);
  router.get("/profit-and-loss", requireFeature("profit-and-loss"), requireAnyPermission(PERMISSIONS.VIEW_PROFIT_AND_LOSS, PERMISSIONS.REPORT_PROFIT_LOSS), controller.profitAndLoss);
  router.get("/balance-sheet", requireFeature("balance-sheet"), requireAnyPermission(PERMISSIONS.VIEW_BALANCE_SHEET, PERMISSIONS.REPORT_BALANCE_SHEET), controller.balanceSheet);
  router.get("/cash-flow", requireFeature("cash-flow"), requirePermission(PERMISSIONS.REPORT_CASH_FLOW), controller.cashFlow);

  return router;
}
