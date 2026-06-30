import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createFinanceAccountsRoutes(financeAccountController) {
  const router = Router();

  router.use(requireFeature("finance-accounts"));

  router.get("/", requirePermission(PERMISSIONS.MANAGE_FINANCE_ACCOUNTS), financeAccountController.listAccounts);
  router.get("/transactions", requirePermission(PERMISSIONS.MANAGE_FINANCE_ACCOUNTS), financeAccountController.listTransactions);
  router.post("/transactions", requirePermission(PERMISSIONS.MANAGE_FINANCE_ACCOUNTS), financeAccountController.createTransaction);
  router.post("/transfers", requirePermission(PERMISSIONS.MANAGE_FINANCE_ACCOUNTS), financeAccountController.createTransfer);
  router.delete("/transactions/:id", requirePermission(PERMISSIONS.MANAGE_FINANCE_ACCOUNTS), financeAccountController.removeTransaction);

  return router;
}
