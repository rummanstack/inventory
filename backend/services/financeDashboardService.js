import { startOfMonth, startOfNextMonth } from "../lib/dateRanges.js";
import { listExpensesInRange } from "../repositories/expenseRepository.js";
import { sumLatestDueBalances } from "../repositories/dsrDueLedgerRepository.js";
import { sumLatestCustomerDueBalances } from "../repositories/customerDueLedgerRepository.js";
import { sumLatestSupplierDueBalances } from "../repositories/supplierDueLedgerRepository.js";

export class FinanceDashboardService {
  constructor(databaseManager, { financeAccountService, profitService }) {
    this.databaseManager = databaseManager;
    this.financeAccountService = financeAccountService;
    this.profitService = profitService;
  }

  async getDashboard(actor) {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const monthStart = startOfMonth(month);
    const nextMonthStart = startOfNextMonth(month);

    const [accounts, dueAndExpenseTotals, profitReport] = await Promise.all([
      this.financeAccountService.listAccounts(actor),
      this.databaseManager.withClient(async (client) => {
        const [totalDsrDue, totalCustomerDue, totalSupplierDue, monthlyExpenseEntries] = await Promise.all([
          sumLatestDueBalances(client, actor.tenantId),
          sumLatestCustomerDueBalances(client, actor.tenantId),
          sumLatestSupplierDueBalances(client, actor.tenantId),
          listExpensesInRange(client, monthStart, nextMonthStart, actor.tenantId),
        ]);

        return {
          totalDsrDue,
          totalCustomerDue,
          totalSupplierDue,
          monthlyExpenses: monthlyExpenseEntries.reduce((sum, expense) => sum + expense.amount, 0),
        };
      }),
      this.profitService.getProfitReport({ dateFrom: monthStart, dateTo: today }, actor),
    ]);

    const totalCashBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const monthlyProfit = profitReport.totals.profit;
    const { totalDsrDue, totalCustomerDue, totalSupplierDue, monthlyExpenses } = dueAndExpenseTotals;

    return {
      accounts,
      totalCashBalance,
      totalDsrDue,
      totalCustomerDue,
      totalSupplierDue,
      monthlyExpenses,
      monthlyProfit,
      netPosition: totalCashBalance + totalDsrDue + totalCustomerDue - totalSupplierDue,
    };
  }
}
