import { useEffect, useState } from 'react';
import {
  buildActivityHeatmap,
  buildCategoryInventory,
  buildDailyRows,
  buildRoutePerformance,
  buildTopPayableProducts,
  buildTradingTrend,
} from '../../../models/inventoryViewData.js';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCasePiece, formatCurrency, formatNumber, getLowStockProducts } from '../../../utils/calculations.js';
import { getCssVar } from '../../../utils/theme.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthlyTrend(rows) {
  return rows.map((row) => {
    const [, monthNum] = row.month.split('-');
    return {
      label: MONTH_NAMES[parseInt(monthNum, 10) - 1] || row.month,
      sales: row.totalSales,
      profit: row.totalProfit,
    };
  });
}

const DAY_SCOPE_PAGE_SIZE = 100;
const TREND_DAYS = 7;
const HEATMAP_DAYS = 70;
const HEATMAP_PAGE_SIZE = 400;
const CALENDAR_DAYS = 365;

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function computeDelta(today, yesterday) {
  if (yesterday === 0) return { pct: null, up: today >= 0 };
  const pct = Math.round(Math.abs(((today - yesterday) / yesterday) * 100));
  return { pct, up: today >= yesterday };
}

export function useDashboardViewModel({ products, dsrs, today, t, language = 'en' }) {
  const [todayIssues, setTodayIssues] = useState([]);
  const [todaySettlements, setTodaySettlements] = useState([]);
  const [trendIssues, setTrendIssues] = useState([]);
  const [trendSettlements, setTrendSettlements] = useState([]);
  const [heatmapIssues, setHeatmapIssues] = useState([]);
  const [heatmapSettlements, setHeatmapSettlements] = useState([]);
  const [yesterdayIssues, setYesterdayIssues] = useState([]);
  const [yesterdaySettlements, setYesterdaySettlements] = useState([]);
  const [todaySalesInvoices, setTodaySalesInvoices] = useState([]);
  const [trendRetailInvoices, setTrendRetailInvoices] = useState([]);
  const [financeDashboard, setFinanceDashboard] = useState(null);
  const [retailCashSession, setRetailCashSession] = useState(undefined);
  const [todayExpenseReport, setTodayExpenseReport] = useState(null);
  const [dsrTargetSummary, setDsrTargetSummary] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [todayDueLedger, setTodayDueLedger] = useState([]);
  const [calendarDailyReport, setCalendarDailyReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!today) {
      return undefined;
    }

    async function load() {
      try {
        setLoading(true);
        setError('');
        const trendFrom = subtractDays(today, TREND_DAYS - 1);
        const heatmapFrom = subtractDays(today, HEATMAP_DAYS - 1);
        const calendarFrom = subtractDays(today, CALENDAR_DAYS - 1);
        const yesterday = subtractDays(today, 1);
        const [
          todayIssuesResult,
          todaySettlementsResult,
          trendIssuesResult,
          trendSettlementsResult,
          heatmapIssuesResult,
          heatmapSettlementsResult,
          yesterdayIssuesResult,
          yesterdaySettlementsResult,
          todaySalesResult,
          trendRetailResult,
          financeDashboardResult,
          cashSessionResult,
          expenseReportResult,
          dsrTargetSummaryResult,
          monthlyTrendResult,
          todayDueLedgerResult,
          calendarDailyReportResult,
        ] = await Promise.all([
          inventoryApi.listIssues({ dateFrom: today, dateTo: today, pageSize: DAY_SCOPE_PAGE_SIZE }),
          inventoryApi.listSettlements({ dateFrom: today, dateTo: today, pageSize: DAY_SCOPE_PAGE_SIZE }),
          inventoryApi.listIssues({ dateFrom: trendFrom, dateTo: today, pageSize: DAY_SCOPE_PAGE_SIZE }),
          inventoryApi.listSettlements({ dateFrom: trendFrom, dateTo: today, pageSize: DAY_SCOPE_PAGE_SIZE }),
          inventoryApi.listIssues({ dateFrom: heatmapFrom, dateTo: today, pageSize: HEATMAP_PAGE_SIZE }),
          inventoryApi.listSettlements({ dateFrom: heatmapFrom, dateTo: today, pageSize: HEATMAP_PAGE_SIZE }),
          inventoryApi.listIssues({ dateFrom: yesterday, dateTo: yesterday, pageSize: DAY_SCOPE_PAGE_SIZE }),
          inventoryApi.listSettlements({ dateFrom: yesterday, dateTo: yesterday, pageSize: DAY_SCOPE_PAGE_SIZE }),
          inventoryApi.listSalesInvoices({ dateFrom: today, dateTo: today, pageSize: 2000 }).catch(() => ({ items: [] })),
          inventoryApi.listSalesInvoices({ dateFrom: trendFrom, dateTo: today, pageSize: 2000 }).catch(() => ({ items: [] })),
          inventoryApi.getFinanceDashboard().catch(() => null),
          inventoryApi.getCurrentRetailCashSession().catch(() => null),
          inventoryApi.getExpenseReport({ date: today }).catch(() => null),
          inventoryApi.getDsrTargetSummary(today.slice(0, 7)).catch(() => ({ summary: [] })),
          inventoryApi.getMonthlyTrend().catch(() => ({ rows: [] })),
          inventoryApi.listDsrDueLedger({ dateFrom: today, dateTo: today, pageSize: 500 }).catch(() => ({ items: [] })),
          inventoryApi.getDailySalesReport({ dateFrom: calendarFrom, dateTo: today }).catch(() => []),
        ]);

        if (cancelled) {
          return;
        }

        setTodayIssues(todayIssuesResult.items || []);
        setTodaySettlements(todaySettlementsResult.items || []);
        setTrendIssues(trendIssuesResult.items || []);
        setTrendSettlements(trendSettlementsResult.items || []);
        setHeatmapIssues(heatmapIssuesResult.items || []);
        setHeatmapSettlements(heatmapSettlementsResult.items || []);
        setYesterdayIssues(yesterdayIssuesResult.items || []);
        setYesterdaySettlements(yesterdaySettlementsResult.items || []);
        setTodaySalesInvoices(todaySalesResult?.items || []);
        setTrendRetailInvoices(trendRetailResult?.items || []);
        setFinanceDashboard(financeDashboardResult);
        setRetailCashSession(cashSessionResult);
        setTodayExpenseReport(expenseReportResult);
        setDsrTargetSummary(dsrTargetSummaryResult?.summary || []);
        setMonthlyTrend(formatMonthlyTrend(monthlyTrendResult?.rows || []));
        setTodayDueLedger(todayDueLedgerResult?.items || []);
        setCalendarDailyReport(calendarDailyReportResult?.rows || []);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setTodayIssues([]);
          setTodaySettlements([]);
          setTrendIssues([]);
          setTrendSettlements([]);
          setHeatmapIssues([]);
          setHeatmapSettlements([]);
          setYesterdayIssues([]);
          setYesterdaySettlements([]);
          setTodaySalesInvoices([]);
          setTrendRetailInvoices([]);
          setFinanceDashboard(null);
          setRetailCashSession(null);
          setMonthlyTrend([]);
          setTodayDueLedger([]);
          setCalendarDailyReport([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const activeDsrs = dsrs.filter((dsr) => dsr.status === 'Active').length;
  const stockUnits = products.reduce((sum, product) => sum + product.stockPieces, 0);
  const stockValue = products.reduce((sum, product) => sum + (product.stockPieces + Number(product.damagedPieces || 0)) * Number(product.purchasePrice || 0), 0);
  const stockSellingValue = products.reduce((sum, product) => sum + product.stockPieces * Number(product.wholesalePrice || 0), 0);
  const expectedStockProfit = stockSellingValue - stockValue;
  const totalIssuedToday = todayIssues.reduce((sum, issue) => sum + issue.items.reduce((itemSum, item) => itemSum + item.issuedPieces, 0), 0);
  const totalReturnedToday = todaySettlements.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + item.returnedPieces, 0), 0);
  const totalSoldToday = todaySettlements.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + item.soldPieces, 0), 0);
  const payableToday = todaySettlements.reduce((sum, settlement) => sum + Number(settlement.amountPaid || 0), 0);
  const lowStockAll = getLowStockProducts(products);
  const outOfStockCount = products.filter((product) => product.stockPieces === 0).length;
  const lowStockProducts = [...lowStockAll].sort((a, b) => a.stockPieces - b.stockPieces).slice(0, 8);
  const dailyRows = buildDailyRows({ date: today, dsrs, issues: todayIssues, settlements: todaySettlements, products, language });
  const pendingRows = dailyRows.filter((row) => row.status === 'Pending');
  const completedRows = dailyRows.filter((row) => row.status === 'Completed');
  const issuedDsrIds = new Set(todayIssues.map((issue) => issue.dsrId));
  const notIssuedDsrs = dsrs.filter((dsr) => dsr.status === 'Active' && !issuedDsrIds.has(dsr.id));
  const completionRate = issuedDsrIds.size ? Math.round((completedRows.length / issuedDsrIds.size) * 100) : 0;
  const averagePayable = completedRows.length ? payableToday / completedRows.length : 0;
  const topStockValueProducts = [...products]
    .sort((a, b) => b.stockPieces * b.purchasePrice - a.stockPieces * a.purchasePrice)
    .slice(0, 5);
  const topSoldProducts = Array.from(
    todaySettlements
      .flatMap((settlement) => settlement.items)
      .reduce((map, item) => {
        const existing = map.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          soldPieces: 0,
          payable: 0,
        };
        existing.soldPieces += Number(item.soldPieces || 0);
        existing.payable += Number(item.payable || 0);
        map.set(item.productId, existing);
        return map;
      }, new Map())
      .values(),
  )
    .sort((a, b) => b.payable - a.payable)
    .slice(0, 5);

  // Retail POS today
  const retailInvoiceCount = todaySalesInvoices.length;
  const retailRevenue = todaySalesInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const retailAvgBasket = retailInvoiceCount > 0 ? retailRevenue / retailInvoiceCount : 0;
  const retailDue = todaySalesInvoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
  const retailProfit = todaySalesInvoices.reduce((sum, inv) => sum + Number(inv.totalProfit || 0), 0);

  // Yesterday comparison
  const yesterdayIssuedPcs = yesterdayIssues.reduce((sum, issue) => sum + issue.items.reduce((s, i) => s + Number(i.issuedPieces || 0), 0), 0);
  const yesterdaySoldPcs = yesterdaySettlements.reduce((sum, s) => sum + s.items.reduce((s2, i) => s2 + Number(i.soldPieces || 0), 0), 0);
  const yesterdayPayable = yesterdaySettlements.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);

  // Top & least selling products over the 7-day trend period (DSR + retail)
  const trendSalesByProduct = new Map();
  for (const s of trendSettlements) {
    for (const item of s.items) {
      const existing = trendSalesByProduct.get(item.productId) || { productId: item.productId, productName: item.productName, soldPieces: 0 };
      existing.soldPieces += Number(item.soldPieces || 0);
      trendSalesByProduct.set(item.productId, existing);
    }
  }
  for (const inv of trendRetailInvoices) {
    for (const item of inv.items || []) {
      const existing = trendSalesByProduct.get(item.productId) || { productId: item.productId, productName: item.productName, soldPieces: 0 };
      existing.soldPieces += Number(item.quantityPieces || 0);
      trendSalesByProduct.set(item.productId, existing);
    }
  }

  const topSellingProducts = Array.from(trendSalesByProduct.values())
    .filter((p) => p.soldPieces > 0)
    .sort((a, b) => b.soldPieces - a.soldPieces)
    .slice(0, 7)
    .map((p) => ({ label: p.productName, value: p.soldPieces }));

  const todayActiveProductIds = new Set([
    ...todayIssues.flatMap((issue) => (issue.items || []).map((i) => i.productId)),
    ...todaySettlements.flatMap((s) => (s.items || []).filter((i) => Number(i.soldPieces) > 0).map((i) => i.productId)),
  ]);

  const noSaleToday = products
    .filter((p) => p.stockPieces > 0 && !todayActiveProductIds.has(p.id))
    .sort((a, b) => b.stockPieces - a.stockPieces);

  const leastSellingProducts = products
    .map((p) => ({
      label: p.name,
      value: trendSalesByProduct.get(p.id)?.soldPieces || 0,
    }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 7);

  // ── Today's P&L ──
  const productMap = new Map(products.map((p) => [p.id, p]));

  const dsrProfitRows = Array.from(
    todaySettlements.reduce((map, settlement) => {
      const existing = map.get(settlement.dsrId) || {
        dsrId: settlement.dsrId,
        dsrName: settlement.dsrName || '',
        area: settlement.area || '',
        revenue: 0,
        cogs: 0,
        amountPaid: 0,
      };
      for (const item of settlement.items) {
        existing.revenue += Number(item.soldPieces || 0) * Number(item.rate || 0);
        existing.cogs += Number(item.soldPieces || 0) * Number(productMap.get(item.productId)?.purchasePrice || 0);
      }
      existing.amountPaid += Number(settlement.amountPaid || 0);
      map.set(settlement.dsrId, existing);
      return map;
    }, new Map()).values(),
  ).sort((a, b) => (b.revenue - b.cogs) - (a.revenue - a.cogs));

  const productProfitRows = Array.from(
    todaySettlements.flatMap((s) => s.items).reduce((map, item) => {
      const existing = map.get(item.productId) || { productId: item.productId, productName: item.productName || '', soldPieces: 0, revenue: 0, cogs: 0 };
      existing.soldPieces += Number(item.soldPieces || 0);
      existing.revenue += Number(item.soldPieces || 0) * Number(item.rate || 0);
      existing.cogs += Number(item.soldPieces || 0) * Number(productMap.get(item.productId)?.purchasePrice || 0);
      map.set(item.productId, existing);
      return map;
    }, new Map()).values(),
  ).sort((a, b) => (b.revenue - b.cogs) - (a.revenue - a.cogs));

  const todayDailyExpenses = todayExpenseReport?.dailyExpenses || [];
  const expenseTotal = todayDailyExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const expensesByCategory = Object.entries(
    todayDailyExpenses.reduce((map, e) => { const cat = e.category || 'Other'; map[cat] = (map[cat] || 0) + Number(e.amount || 0); return map; }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const grossRevenue = dsrProfitRows.reduce((sum, r) => sum + r.revenue, 0);
  const grossCogs = dsrProfitRows.reduce((sum, r) => sum + r.cogs, 0);
  const grossProfit = grossRevenue - grossCogs;
  const netProfit = grossProfit - expenseTotal;

  // DSR leaderboard (top 5 by total cash collected today: settlement amountPaid + later due collections)
  const leaderboardMap = new Map();
  for (const s of todaySettlements) {
    const existing = leaderboardMap.get(s.dsrId) || {
      label: dsrs.find((d) => d.id === s.dsrId)?.name || s.dsrName || s.dsrId,
      value: 0,
    };
    existing.value += Number(s.amountPaid || 0);
    leaderboardMap.set(s.dsrId, existing);
  }
  for (const entry of todayDueLedger) {
    if (entry.type !== 'COLLECTION' || entry.referenceType === 'settlement') continue;
    const existing = leaderboardMap.get(entry.dsrId) || {
      label: dsrs.find((d) => d.id === entry.dsrId)?.name || entry.dsrName || entry.dsrId,
      value: 0,
    };
    existing.value += Number(entry.credit || 0);
    leaderboardMap.set(entry.dsrId, existing);
  }
  const dsrLeaderboard = Array.from(leaderboardMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    loading,
    error,
    activeDsrs,
    stockValue,
    stockSellingValue,
    expectedStockProfit,
    stockUnits,
    totalIssuedToday,
    totalReturnedToday,
    totalSoldToday,
    payableToday,
    lowStockAll,
    outOfStockCount,
    pendingRows,
    completedRows,
    completionRate,
    ownerTasks: [
      {
        iconKey: totalIssuedToday ? 'morningStarted' : 'morningPending',
        title: totalIssuedToday ? t('dashboard.taskMorningStarted') : t('dashboard.taskMorningPending'),
        detail: totalIssuedToday ? t('dashboard.taskMorningStartedDetail', { count: formatNumber(totalIssuedToday, language) }) : t('dashboard.taskMorningPendingDetail'),
        tone: totalIssuedToday ? 'emerald' : 'amber',
      },
      {
        iconKey: pendingRows.length ? 'returnPending' : 'returnClear',
        title: pendingRows.length ? t('dashboard.taskReturnPending') : t('dashboard.taskReturnClear'),
        detail: pendingRows.length ? t('dashboard.taskReturnPendingDetail', { count: formatNumber(pendingRows.length, language) }) : t('dashboard.taskReturnClearDetail'),
        tone: pendingRows.length ? 'amber' : 'emerald',
      },
      {
        iconKey: lowStockAll.length ? 'stockAttention' : 'stockHealthy',
        title: lowStockAll.length ? t('dashboard.taskStockAttention') : t('dashboard.taskStockHealthy'),
        detail: lowStockAll.length ? t('dashboard.taskStockAttentionDetail', { lowStock: formatNumber(lowStockAll.length, language), outOfStock: formatNumber(outOfStockCount, language) }) : t('dashboard.taskStockHealthyDetail'),
        tone: lowStockAll.length ? 'rose' : 'emerald',
      },
      {
        iconKey: payableToday ? 'cashVisible' : 'cashEmpty',
        title: payableToday ? t('dashboard.taskCashVisible') : t('dashboard.taskCashEmpty'),
        detail: payableToday ? t('dashboard.taskCashVisibleDetail', { amount: formatCurrency(payableToday, language) }) : t('dashboard.taskCashEmptyDetail'),
        tone: payableToday ? 'blue' : 'slate',
      },
    ],
    tradingTrend: buildTradingTrend({ issues: trendIssues, settlements: trendSettlements, today, limit: TREND_DAYS, retailInvoices: trendRetailInvoices }),
    activityHeatmap: buildActivityHeatmap({ settlements: heatmapSettlements, today, days: CALENDAR_DAYS, language, retailDailyReport: calendarDailyReport }),
    inventoryByCategory: buildCategoryInventory(products, language),
    routePerformance: buildRoutePerformance(dailyRows, language),
    topPayableProducts: buildTopPayableProducts(todaySettlements, language, todaySalesInvoices),
    settlementMix: [
      { label: t('dashboard.completed'), value: completedRows.length, color: getCssVar('--success', '#37a864') },
      { label: t('dashboard.pending'), value: pendingRows.length, color: getCssVar('--warning', '#f8aa17') },
      { label: t('dashboard.noIssue'), value: Math.max(activeDsrs - issuedDsrIds.size, 0), color: getCssVar('--muted', '#8c8f9e') },
    ],
    operationalPulse: [
      { title: t('dashboard.collectionFlow'), value: `${formatNumber(completionRate, language)}%`, subtitle: t('dashboard.collectionFlowDesc') },
      { title: t('dashboard.averageTicket'), value: formatCurrency(averagePayable, language), subtitle: t('dashboard.averageTicketDesc') },
      { title: t('dashboard.attentionStock'), value: formatNumber(lowStockAll.length, language), subtitle: t('dashboard.attentionStockDesc') },
    ],
    summaryLines: [
      { label: t('dashboard.issuedTodaySummary'), value: `${formatNumber(issuedDsrIds.size, language)} / ${formatNumber(activeDsrs, language)}` },
      { label: t('dashboard.issueSheetsMade'), value: formatNumber(todayIssues.length, language) },
      { label: t('dashboard.averageCashPerDsr'), value: formatCurrency(averagePayable, language) },
      { label: t('dashboard.activeDsrNotIssued'), value: `${formatNumber(notIssuedDsrs.length, language)} ${t('common.dsr')}` },
      { label: t('dashboard.highestStockSku'), value: topStockValueProducts[0] ? topStockValueProducts[0].name : '-' },
      { label: t('dashboard.bestSoldToday'), value: topSoldProducts[0] ? topSoldProducts[0].productName : '-' },
    ],
    actionQueue: {
      pendingRows,
      lowStockProducts,
      formatCasePiece,
    },
    topSellingProducts,
    leastSellingProducts,
    // New insights
    retailPos: {
      invoiceCount: retailInvoiceCount,
      revenue: retailRevenue,
      avgBasket: retailAvgBasket,
      dueAmount: retailDue,
      profit: retailProfit,
    },
    retailCashSession,
    financeDashboard,
    dsrTargetSummary,
    noSaleToday,
    dsrLeaderboard,
    monthlyTrend,
    todayPnl: { grossRevenue, grossCogs, grossProfit, expenseTotal, netProfit, dsrProfitRows, productProfitRows, expensesByCategory },
    yesterdayDeltas: {
      issued: computeDelta(totalIssuedToday, yesterdayIssuedPcs),
      sold: computeDelta(totalSoldToday, yesterdaySoldPcs),
      collected: computeDelta(payableToday, yesterdayPayable),
      issuedToday: totalIssuedToday,
      soldToday: totalSoldToday,
      collectedToday: payableToday,
      issuedYesterday: yesterdayIssuedPcs,
      soldYesterday: yesterdaySoldPcs,
      collectedYesterday: yesterdayPayable,
    },
  };
}
