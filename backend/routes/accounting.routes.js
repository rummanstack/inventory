import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createAccountingRoutes(accountingController) {
  const router = Router();

  router.get(
    "/dashboard",
    requireFeature("accounting-dashboard"),
    requirePermission(PERMISSIONS.VIEW_ACCOUNTING_DASHBOARD),
    accountingController.dashboard,
  );

  router.get(
    "/accounts",
    requireFeature("chart-of-accounts"),
    requirePermission(PERMISSIONS.VIEW_CHART_OF_ACCOUNTS),
    accountingController.listAccounts,
  );
  router.post(
    "/accounts",
    requireFeature("chart-of-accounts"),
    requirePermission(PERMISSIONS.MANAGE_CHART_OF_ACCOUNTS),
    accountingController.createAccount,
  );
  router.put(
    "/accounts/:code",
    requireFeature("chart-of-accounts"),
    requirePermission(PERMISSIONS.MANAGE_CHART_OF_ACCOUNTS),
    accountingController.updateAccount,
  );

  router.get(
    "/fiscal-years",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_FISCAL_YEARS),
    accountingController.listFiscalYears,
  );
  router.post(
    "/fiscal-years",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_FISCAL_YEARS),
    accountingController.createFiscalYear,
  );
  router.post(
    "/fiscal-years/:id/activate",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_FISCAL_YEARS),
    accountingController.activateFiscalYear,
  );
  router.post(
    "/fiscal-years/:id/close",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_FISCAL_YEARS),
    accountingController.closeFiscalYear,
  );

  router.post(
    "/periods/:id/open",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_ACCOUNTING_PERIODS),
    accountingController.openPeriod,
  );
  router.post(
    "/periods/:id/close",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_ACCOUNTING_PERIODS),
    accountingController.closePeriod,
  );
  router.post(
    "/periods/:id/lock",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_ACCOUNTING_PERIODS),
    accountingController.lockPeriod,
  );
  router.post(
    "/periods/:id/reopen",
    requireFeature("fiscal-years"),
    requirePermission(PERMISSIONS.MANAGE_ACCOUNTING_PERIODS),
    accountingController.reopenPeriod,
  );

  router.get(
    "/opening-balances",
    requireFeature("opening-balances"),
    requirePermission(PERMISSIONS.VIEW_OPENING_BALANCES),
    accountingController.listOpeningBalances,
  );
  router.post(
    "/opening-balances",
    requireFeature("opening-balances"),
    requirePermission(PERMISSIONS.MANAGE_OPENING_BALANCES),
    accountingController.createOpeningBalance,
  );
  router.put(
    "/opening-balances/:id",
    requireFeature("opening-balances"),
    requirePermission(PERMISSIONS.MANAGE_OPENING_BALANCES),
    accountingController.updateOpeningBalance,
  );

  router.get(
    "/settings",
    requireFeature("accounting-settings"),
    requirePermission(PERMISSIONS.MANAGE_ACCOUNTING_SETTINGS),
    accountingController.getSettings,
  );
  router.put(
    "/settings",
    requireFeature("accounting-settings"),
    requirePermission(PERMISSIONS.MANAGE_ACCOUNTING_SETTINGS),
    accountingController.updateSettings,
  );

  return router;
}
