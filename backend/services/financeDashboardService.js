import { startOfMonth, startOfNextMonth, normalizeIsoDate, addDays } from "../lib/dateRanges.js";
import { listExpensesInRange, sumExpensesByCategory } from "../repositories/expenseRepository.js";
import { sumLatestDueBalances } from "../repositories/dsrDueLedgerRepository.js";
import { sumLatestCustomerDueBalances } from "../repositories/customerDueLedgerRepository.js";
import { sumLatestSupplierDueBalances } from "../repositories/supplierDueLedgerRepository.js";
import { getMonthlyCashFlow, listRecentTransactions } from "../repositories/financeAccountRepository.js";
import { sumSettlementsInRange, listRecentSettlements, getDailySettlementTrend } from "../repositories/settlementRepository.js";
import { sumSalesInvoicesInRange, getDailyRevenueTrend } from "../repositories/salesInvoiceRepository.js";

function fillDays(rows, dayKey, valueKey, startDate, endDateExclusive) {
  const map = new Map(rows.map((r) => [r[dayKey], Number(r[valueKey] || 0)]));
  const result = [];
  let current = startDate;
  while (current < endDateExclusive) {
    result.push(map.get(current) ?? 0);
    current = addDays(current, 1);
  }
  return result;
}

function trendPct(current, previous) {
  return previous > 0 ? (current - previous) / previous * 100 : null;
}

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
    const [y, m] = month.split('-').map(Number);
    const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
    const prevMonthStart = prevMonthDate.toISOString().slice(0, 10);
    const prevMonthEnd = addDays(monthStart, -1);

    const [accounts, dueAndExpenseTotals, profitReport, prevProfitReport] = await Promise.all([
      this.financeAccountService.listAccounts(actor),
      this.databaseManager.withClient(async (client) => {
        const [
          totalDsrDue, totalCustomerDue, totalSupplierDue,
          monthlyExpenseEntries, cashFlow, recentTransactions,
          monthlySettlements, recentSettlements, monthlySales,
          dailyRevenue, dailySettlement, prevMonthSales, prevMonthSettlements,
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
          getDailyRevenueTrend(client, actor.tenantId, monthStart, nextMonthStart),
          getDailySettlementTrend(client, actor.tenantId, monthStart, nextMonthStart),
          sumSalesInvoicesInRange(client, actor.tenantId, prevMonthStart, monthStart),
          sumSettlementsInRange(client, actor.tenantId, prevMonthStart, monthStart),
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
          dailyRevenue,
          dailySettlement,
          prevMonthSalesAmount: prevMonthSales.totalAmount,
          prevMonthSettlementCollected: prevMonthSettlements.amountPaid,
        };
      }),
      this.profitService.getProfitReport({ dateFrom: monthStart, dateTo: today }, actor),
      this.profitService.getProfitReport({ dateFrom: prevMonthStart, dateTo: prevMonthEnd }, actor),
    ]);

    const totalCashBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const monthlyProfit = profitReport.totals.profit;
    const {
      totalDsrDue, totalCustomerDue, totalSupplierDue, monthlyExpenses,
      cashFlow, recentTransactions,
      monthlySettlements, recentSettlements, monthlySales,
      dailyRevenue, dailySettlement, prevMonthSalesAmount, prevMonthSettlementCollected,
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
      revenueDailyTrend: fillDays(dailyRevenue, 'day', 'revenue', monthStart, nextMonthStart),
      profitDailyTrend: fillDays(dailyRevenue, 'day', 'profit', monthStart, nextMonthStart),
      settlementDailyTrend: fillDays(dailySettlement, 'day', 'collected', monthStart, nextMonthStart),
      revenueVsLastMonth: trendPct(monthlySales.totalAmount, prevMonthSalesAmount),
      profitVsLastMonth: trendPct(monthlyProfit, prevProfitReport.totals.profit),
      settlementVsLastMonth: trendPct(monthlySettlements.amountPaid, prevMonthSettlementCollected),
    };
  }

  async getRangeReport(query = {}, actor) {
    const today = new Date().toISOString().slice(0, 10);
    const dateFrom = normalizeIsoDate(query.dateFrom, today.slice(0, 7) + "-01");
    const dateTo = normalizeIsoDate(query.dateTo, today);

    const dateToExclusive = addDays(dateTo, 1);

    const [profitReport, rangeData] = await Promise.all([
      this.profitService.getProfitReport({ dateFrom, dateTo }, actor),
      this.databaseManager.withClient(async (client) => {
        const [expenseBreakdown, totalDsrDue, totalCustomerDue, totalSupplierDue, cashFlow, sales] = await Promise.all([
          sumExpensesByCategory(client, dateFrom, dateTo, actor.tenantId),
          sumLatestDueBalances(client, actor.tenantId),
          sumLatestCustomerDueBalances(client, actor.tenantId),
          sumLatestSupplierDueBalances(client, actor.tenantId),
          getMonthlyCashFlow(client, actor.tenantId, dateFrom, dateToExclusive),
          sumSalesInvoicesInRange(client, actor.tenantId, dateFrom, dateToExclusive),
        ]);
        return { expenseBreakdown, totalDsrDue, totalCustomerDue, totalSupplierDue, cashFlow, sales };
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
      cashFlow: rangeData.cashFlow,
      sales: {
        count: rangeData.sales.count,
        totalAmount: rangeData.sales.totalAmount,
        paidAmount: rangeData.sales.paidAmount,
        averageInvoice: rangeData.sales.count > 0 ? rangeData.sales.totalAmount / rangeData.sales.count : 0,
      },
    };
  }

  async getMonthlyTrend(actor) {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - 11);
    const dateFrom = start.toISOString().slice(0, 10);

    const report = await this.profitService.getProfitReport({ dateFrom, dateTo: today }, actor);
    const monthMap = new Map(report.monthly.map((m) => [m.month, m]));

    const rows = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (11 - i));
      const month = d.toISOString().slice(0, 7);
      const data = monthMap.get(month);
      return { month, totalSales: data?.revenue ?? 0, totalProfit: data?.profit ?? 0 };
    });

    return { rows };
  }
}
