import { startOfMonth, startOfNextMonth, normalizeIsoDate, addDays } from "../lib/dateRanges.js";
import { listExpensesInRange, sumExpensesByCategory } from "../repositories/expenseRepository.js";
import { sumLatestDueBalances } from "../repositories/dsrDueLedgerRepository.js";
import { sumLatestCustomerDueBalances } from "../repositories/customerDueLedgerRepository.js";
import { sumLatestSupplierDueBalances } from "../repositories/supplierDueLedgerRepository.js";
import { getMonthlyCashFlow, listRecentTransactions } from "../repositories/financeAccountRepository.js";
import { sumSettlementsInRange, listRecentSettlements } from "../repositories/settlementRepository.js";
import { sumSalesInvoicesInRange } from "../repositories/salesInvoiceRepository.js";

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
        const [
          totalDsrDue, totalCustomerDue, totalSupplierDue,
          monthlyExpenseEntries, cashFlow, recentTransactions,
          monthlySettlements, recentSettlements, monthlySales,
        ] = await Promise.all([
          sumLatestDueBalances(client, actor.tenantId),
          sumLatestCustomerDueBalances(client, actor.tenantId),
          sumLatestSupplierDueBalances(client, actor.tenantId),
          listExpensesInRange(client, monthStart, nextMonthStart, actor.tenantId),
          getMonthlyCashFlow(client, actor.tenantId, monthStart, nextMonthStart),
          listRecentTransactions(client, actor.tenantId, 5),
          sumSettlementsInRange(client, actor.tenantId, monthStart, nextMonthStart),
          listRecentSettlements(client, actor.tenantId, 7),
          sumSalesInvoicesInRange(client, actor.tenantId, monthStart, nextMonthStart),
        ]);

        return {
          totalDsrDue,
          totalCustomerDue,
          totalSupplierDue,
          monthlyExpenses: monthlyExpenseEntries.reduce((sum, expense) => sum + expense.amount, 0),
          cashFlow,
          recentTransactions,
          monthlySettlements,
          recentSettlements,
          monthlySales,
        };
      }),
      this.profitService.getProfitReport({ dateFrom: monthStart, dateTo: today }, actor),
    ]);

    const totalCashBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const monthlyProfit = profitReport.totals.profit;
    const {
      totalDsrDue, totalCustomerDue, totalSupplierDue, monthlyExpenses,
      cashFlow, recentTransactions,
      monthlySettlements, recentSettlements, monthlySales,
    } = dueAndExpenseTotals;

    return {
      accounts,
      totalCashBalance,
      totalDsrDue,
      totalCustomerDue,
      totalSupplierDue,
      monthlyExpenses,
      monthlyProfit,
      monthlyInflow: cashFlow.inflow,
      monthlyOutflow: cashFlow.outflow,
      recentTransactions,
      monthlySettlementCollected: monthlySettlements.amountPaid,
      monthlySettlementDue: monthlySettlements.dueAmount,
      monthlySettlementCount: monthlySettlements.count,
      monthlySalesAmount: monthlySales.totalAmount,
      monthlySalesCount: monthlySales.count,
      recentSettlements,
      netPosition: totalCashBalance + totalDsrDue + totalCustomerDue - totalSupplierDue,
    };
  }

  async getRangeReport(query = {}, actor) {
    const today = new Date().toISOString().slice(0, 10);
    const dateFrom = normalizeIsoDate(query.dateFrom, today.slice(0, 7) + "-01");
    const dateTo = normalizeIsoDate(query.dateTo, today);

    const [profitReport, rangeData] = await Promise.all([
      this.profitService.getProfitReport({ dateFrom, dateTo }, actor),
      this.databaseManager.withClient(async (client) => {
        const [expenseBreakdown, totalDsrDue, totalCustomerDue, totalSupplierDue] = await Promise.all([
          sumExpensesByCategory(client, dateFrom, dateTo, actor.tenantId),
          sumLatestDueBalances(client, actor.tenantId),
          sumLatestCustomerDueBalances(client, actor.tenantId),
          sumLatestSupplierDueBalances(client, actor.tenantId),
        ]);
        return { expenseBreakdown, totalDsrDue, totalCustomerDue, totalSupplierDue };
      }),
    ]);

    const { revenue, cost, expenses, profit } = profitReport.totals;
    return {
      dateFrom: profitReport.dateFrom,
      dateTo: profitReport.dateTo,
      revenue,
      cogs: cost,
      totalExpenses: expenses,
      grossProfit: revenue - cost,
      netProfit: profit,
      expenseBreakdown: rangeData.expenseBreakdown,
      totalDsrDue: rangeData.totalDsrDue,
      totalCustomerDue: rangeData.totalCustomerDue,
      totalSupplierDue: rangeData.totalSupplierDue,
    };
  }
}
