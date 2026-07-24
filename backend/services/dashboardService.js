import { normalizeIsoDate, startOfMonth } from "../lib/dateRanges.js";
import { findTenantById } from "../repositories/tenantRepository.js";

const PROFILE_DEALER = "DEALER";
const PROFILE_RETAILER = "RETAILER";
const DAY_MS = 86400000;

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(rows, selector) {
  return (rows || []).reduce((total, row) => total + number(selector(row)), 0);
}

function subtractDays(dateIso, days) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  return new Date(date.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}


function lowStockThreshold(product) {
  if (product.reorderLevel !== null && product.reorderLevel !== undefined) {
    return Math.max(0, number(product.reorderLevel));
  }
  return Math.max(1, number(product.piecesPerCase || 1)) * 4;
}

function buildInventory(products) {
  const categories = new Map();
  const lowStock = [];
  const outOfStock = [];
  let inventoryValue = 0;
  let damagedValue = 0;
  let stockUnits = 0;

  for (const product of products) {
    const stock = number(product.stockPieces);
    const damaged = number(product.damagedPieces);
    const cost = number(product.purchasePrice);
    const value = stock * cost;
    const category = product.category || "Uncategorized";
    const bucket = categories.get(category) || { label: category, value: 0, units: 0, products: 0, lowStock: 0 };
    bucket.value += value;
    bucket.units += stock;
    bucket.products += 1;

    if (stock <= lowStockThreshold(product)) {
      bucket.lowStock += 1;
      lowStock.push({
        id: product.id,
        name: product.name,
        category,
        stockPieces: stock,
        threshold: lowStockThreshold(product),
        stockValue: value,
      });
    }
    if (stock <= 0) outOfStock.push({ id: product.id, name: product.name, category });

    categories.set(category, bucket);
    inventoryValue += value;
    damagedValue += damaged * cost;
    stockUnits += stock;
  }

  return {
    inventoryValue,
    damagedValue,
    stockUnits,
    productCount: products.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    byCategory: [...categories.values()].sort((left, right) => right.value - left.value),
    lowStock: lowStock.sort((left, right) => left.stockPieces - right.stockPieces).slice(0, 8),
    outOfStock: outOfStock.slice(0, 8),
  };
}

function buildRetailProductPerformance(invoices) {
  const products = new Map();
  for (const invoice of invoices) {
    for (const item of invoice.items || []) {
      const row = products.get(item.productId) || {
        productId: item.productId,
        name: item.productName || "Product",
        revenue: 0,
        profit: 0,
        quantity: 0,
      };
      const quantity = number(item.quantityPieces);
      const revenue = number(item.lineTotal || quantity * number(item.actualSalePrice));
      const cost = quantity * number(item.costPriceSnapshot);
      row.quantity += quantity;
      row.revenue += revenue;
      row.profit += revenue - cost;
      products.set(item.productId, row);
    }
  }
  return [...products.values()]
    .map((row) => ({ ...row, margin: row.revenue > 0 ? row.profit / row.revenue * 100 : 0 }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 8);
}

function buildDealerProductPerformance(settlements) {
  const products = new Map();
  for (const settlement of settlements) {
    for (const item of settlement.items || []) {
      const row = products.get(item.productId) || {
        productId: item.productId,
        name: item.productName || "Product",
        revenue: 0,
        profit: 0,
        quantity: 0,
      };
      const sold = number(item.soldPieces);
      const revenue = number(item.payable || sold * number(item.rate));
      const cost = sold * number(item.costPrice);
      row.quantity += sold;
      row.revenue += revenue;
      row.profit += revenue - cost;
      products.set(item.productId, row);
    }
  }
  return [...products.values()]
    .map((row) => ({ ...row, margin: row.revenue > 0 ? row.profit / row.revenue * 100 : 0 }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 8);
}

function buildRetailProfile({ invoices, returns, cashSession, finance, todaySummary }) {
  const revenue = number(todaySummary?.totalAmount ?? sum(invoices, (invoice) => invoice.totalAmount));
  const paid = number(todaySummary?.paidAmount ?? sum(invoices, (invoice) => invoice.paidAmount));
  const due = number(todaySummary?.dueAmount ?? sum(invoices, (invoice) => invoice.dueAmount));
  const profit = number(todaySummary?.totalProfit ?? sum(invoices, (invoice) => invoice.totalProfit));
  const invoiceCount = number(todaySummary?.invoiceCount ?? invoices.length);
  const returnValue = sum(returns, (item) => item.totalAmount);
  const paymentMap = new Map();
  for (const invoice of invoices) {
    const key = invoice.paymentMethod || (number(invoice.dueAmount) > 0 ? "DUE" : "CASH");
    paymentMap.set(key, number(paymentMap.get(key)) + number(invoice.paidAmount));
  }
  if (due > 0) paymentMap.set("DUE", number(paymentMap.get("DUE")) + due);

  const hourMap = new Map();
  for (const invoice of invoices) {
    const date = new Date(invoice.createdAt || `${invoice.invoiceDate}T00:00:00Z`);
    const hour = Number.isNaN(date.getTime()) ? 0 : date.getHours();
    const row = hourMap.get(hour) || { hour, revenue: 0, invoices: 0 };
    row.revenue += number(invoice.totalAmount);
    row.invoices += 1;
    hourMap.set(hour, row);
  }

  return {
    type: PROFILE_RETAILER,
    today: {
      netSales: Math.max(0, revenue - returnValue),
      grossSales: revenue,
      profit,
      profitMargin: revenue > 0 ? profit / revenue * 100 : 0,
      invoiceCount,
      averageBasket: invoiceCount ? revenue / invoiceCount : 0,
      paidAmount: paid,
      dueSales: due,
      returnValue,
      returnCount: returns.length,
    },
    customerDues: {
      outstanding: number(finance.totalCustomerDue),
      createdToday: due,
    },
    cashSession: cashSession?.session || null,
    hourlySales: Array.from({ length: 24 }, (_, hour) => hourMap.get(hour) || { hour, revenue: 0, invoices: 0 }),
    paymentMix: [...paymentMap.entries()].map(([method, value]) => ({ method, value })),
    topProducts: buildRetailProductPerformance(invoices),
  };
}

function buildDealerProfile({ dsrs, issues, settlements, dueLedger, finance }) {
  const issuedDsrIds = new Set(issues.map((issue) => issue.dsrId));
  const settledDsrIds = new Set(settlements.map((settlement) => settlement.dsrId));
  const issuedPieces = sum(issues, (issue) => sum(issue.items, (item) => item.issuedPieces));
  const soldPieces = sum(settlements, (settlement) => sum(settlement.items, (item) => item.soldPieces));
  const returnedPieces = sum(settlements, (settlement) => sum(settlement.items, (item) => item.returnedPieces));
  const sales = sum(settlements, (settlement) => settlement.totalPayable);
  const collected = sum(settlements, (settlement) => settlement.amountPaid)
    + sum(dueLedger.filter((entry) => entry.type === "COLLECTION" && entry.referenceType !== "settlement"), (entry) => entry.credit);

  const leaderboard = new Map();
  for (const settlement of settlements) {
    const row = leaderboard.get(settlement.dsrId) || {
      dsrId: settlement.dsrId,
      name: settlement.dsrName || "DSR",
      area: settlement.area || "",
      sales: 0,
      collected: 0,
      returns: 0,
      due: 0,
    };
    row.sales += number(settlement.totalPayable);
    row.collected += number(settlement.amountPaid);
    row.due = number(settlement.dueAmount);
    row.returns += sum(settlement.items, (item) => item.returnedPieces);
    leaderboard.set(settlement.dsrId, row);
  }
  for (const entry of dueLedger) {
    if (entry.type !== "COLLECTION" || entry.referenceType === "settlement") continue;
    const row = leaderboard.get(entry.dsrId) || {
      dsrId: entry.dsrId,
      name: entry.dsrName || "DSR",
      area: entry.dsrArea || "",
      sales: 0,
      collected: 0,
      returns: 0,
      due: number(entry.balanceAfter),
    };
    row.collected += number(entry.credit);
    row.due = number(entry.balanceAfter);
    leaderboard.set(entry.dsrId, row);
  }

  return {
    type: PROFILE_DEALER,
    today: {
      activeDsrs: dsrs.length,
      issuedDsrs: issuedDsrIds.size,
      settledDsrs: settledDsrIds.size,
      pendingIssues: Math.max(dsrs.length - issuedDsrIds.size, 0),
      pendingSettlements: Math.max(issuedDsrIds.size - settledDsrIds.size, 0),
      settlementCompletion: issuedDsrIds.size ? settledDsrIds.size / issuedDsrIds.size * 100 : 0,
      issuedPieces,
      soldPieces,
      returnedPieces,
      sales,
      collected,
      dueCreated: sum(settlements, (settlement) => settlement.dueAmount),
    },
    receivables: {
      outstanding: number(finance.totalDsrDue),
      supplierPayables: number(finance.totalSupplierDue),
    },
    pipeline: [
      { key: "active", value: dsrs.length },
      { key: "issued", value: issuedDsrIds.size },
      { key: "settled", value: settledDsrIds.size },
      { key: "collected", value: collected, monetary: true },
    ],
    leaderboard: [...leaderboard.values()]
      .map((row) => ({ ...row, collectionEfficiency: row.sales > 0 ? row.collected / row.sales * 100 : 0 }))
      .sort((left, right) => right.collected - left.collected)
      .slice(0, 8),
    topProducts: buildDealerProductPerformance(settlements),
  };
}

function buildActions({ profile, inventory, finance }) {
  const actions = [];
  if (inventory.outOfStockCount) actions.push({ type: "OUT_OF_STOCK", severity: "critical", count: inventory.outOfStockCount, route: "/low-stock-alerts" });
  if (inventory.lowStockCount) actions.push({ type: "LOW_STOCK", severity: "warning", count: inventory.lowStockCount, route: "/low-stock-alerts" });
  if (profile.type === PROFILE_DEALER) {
    if (profile.today.pendingIssues) actions.push({ type: "PENDING_ISSUES", severity: "warning", count: profile.today.pendingIssues, route: "/morning-issue" });
    if (profile.today.pendingSettlements) actions.push({ type: "PENDING_SETTLEMENTS", severity: "critical", count: profile.today.pendingSettlements, route: "/evening-settlement" });
  } else if (!profile.cashSession) {
    actions.push({ type: "CASH_SESSION_CLOSED", severity: "warning", count: 1, route: "/retailer/quick-sale" });
  }
  const receivables = profile.type === PROFILE_DEALER ? finance.totalDsrDue : finance.totalCustomerDue;
  if (number(receivables) > 0) actions.push({ type: "OUTSTANDING_RECEIVABLES", severity: "info", value: number(receivables), route: profile.type === PROFILE_DEALER ? "/dsr-finance" : "/retailer/customer-due" });
  return actions.slice(0, 6);
}

export class DashboardService {
  constructor(databaseManager, services) {
    this.databaseManager = databaseManager;
    this.services = services;
  }

  async getDashboard(query = {}, actor) {
    const today = normalizeIsoDate(query.date, new Date().toISOString().slice(0, 10));
    const monthStart = startOfMonth(today.slice(0, 7));
    const yesterday = subtractDays(today, 1);
    const heatmapFrom = subtractDays(today, 364);

    const tenant = await this.databaseManager.withClient((client) => findTenantById(client, actor.tenantId));
    const profileType = tenant?.sellerType === PROFILE_RETAILER ? PROFILE_RETAILER : PROFILE_DEALER;

    const [finance, monthlyTrendResult, productsResult, dailySalesResult, expenseResult, monthProfit, yesterdayProfit] = await Promise.all([
      this.services.financeDashboardService.getDashboard(actor),
      this.services.financeDashboardService.getMonthlyTrend(actor),
      this.services.productService.getProductsDirectory(actor),
      this.services.salesInvoiceService.getDailySalesReport({ dateFrom: heatmapFrom, dateTo: today }, actor),
      this.services.expenseService.getExpenseReport({ date: today, month: today.slice(0, 7) }, actor),
      this.services.profitService.getProfitReport({ dateFrom: monthStart, dateTo: today }, actor),
      this.services.profitService.getProfitReport({ dateFrom: yesterday, dateTo: yesterday }, actor),
    ]);

    const inventory = buildInventory(productsResult.products || []);
    let profile;
    let dealerActivity = [];

    if (profileType === PROFILE_RETAILER) {
      const [invoiceResult, returnResult, cashSession] = await Promise.all([
        this.services.salesInvoiceService.listSalesInvoices({ dateFrom: today, dateTo: today, pageSize: 100 }, actor),
        this.services.salesReturnService.listSalesReturns({ dateFrom: today, dateTo: today, pageSize: 100 }, actor),
        this.services.retailCashSessionService.getCurrentSession(actor),
      ]);
      profile = buildRetailProfile({
        invoices: invoiceResult.items || [],
        returns: returnResult.items || [],
        cashSession,
        finance,
        todaySummary: (dailySalesResult.rows || []).find((row) => String(row.date).slice(0, 10) === today),
      });
    } else {
      const [dsrResult, issueResult, settlementResult, dueResult, settlementActivity] = await Promise.all([
        this.services.dsrService.getDsrsDirectory(actor),
        this.services.issueService.listIssues({ dateFrom: today, dateTo: today, pageSize: 100 }, actor),
        this.services.settlementService.listSettlements({ dateFrom: today, dateTo: today, pageSize: 100 }, actor),
        this.services.dsrDueLedgerService.listLedger({ dateFrom: today, dateTo: today, pageSize: 100 }, actor),
        this.services.settlementService.getSettlementReport({ dateFrom: heatmapFrom, dateTo: today }, actor),
      ]);
      dealerActivity = settlementActivity.rows || [];
      profile = buildDealerProfile({
        dsrs: dsrResult.dsrs || [],
        issues: issueResult.items || [],
        settlements: settlementResult.items || [],
        dueLedger: dueResult.items || [],
        finance,
      });
    }

    const retailActivity = dailySalesResult.rows || [];
    const activitySource = profileType === PROFILE_DEALER ? dealerActivity : retailActivity;
    const activity = activitySource.map((row) => ({
      date: row.date,
      transactions: number(row.settlementCount ?? row.invoiceCount),
      revenue: number(row.totalPayable ?? row.totalAmount),
      profit: number(row.totalProfit),
      collected: number(row.amountPaid ?? row.paidAmount),
    }));

    const monthTotals = monthProfit.totals || {};
    const yesterdayTotals = yesterdayProfit.totals || {};
    const receivables = profileType === PROFILE_DEALER ? number(finance.totalDsrDue) : number(finance.totalCustomerDue);
    const cashInHand = sum(finance.accounts?.filter((account) => account.type === "CASH"), (account) => account.balance);
    const cashInBank = sum(finance.accounts?.filter((account) => account.type === "BANK"), (account) => account.balance);

    return {
      version: 1,
      meta: {
        profile: profileType,
        businessType: tenant?.businessType || "ELECTRONICS",
        date: today,
        month: today.slice(0, 7),
        generatedAt: new Date().toISOString(),
        timezone: "Asia/Dhaka",
        currency: "BDT",
      },
      shared: {
        kpis: {
          monthlySales: number(monthTotals.revenue),
          monthlyProfit: number(monthTotals.profit),
          profitMargin: number(monthTotals.revenue) > 0 ? number(monthTotals.profit) / number(monthTotals.revenue) * 100 : 0,
          cashAvailable: cashInHand + cashInBank,
          receivables,
          supplierPayables: number(finance.totalSupplierDue),
          inventoryValue: inventory.inventoryValue,
        },
        comparisons: {
          yesterdaySales: number(yesterdayTotals.revenue),
          yesterdayProfit: number(yesterdayTotals.profit),
          salesVsLastMonth: finance.revenueVsLastMonth,
          profitVsLastMonth: finance.profitVsLastMonth,
        },
        financial: {
          cashInHand,
          cashInBank,
          receivables,
          supplierPayables: number(finance.totalSupplierDue),
          monthlyExpenses: number(finance.monthlyExpenses),
          netPosition: cashInHand + cashInBank + receivables - number(finance.totalSupplierDue),
          accounts: finance.accounts || [],
        },
        inventory,
        monthlyTrend: monthlyTrendResult.rows || [],
        activity,
        expenses: {
          total: number(expenseResult.monthlySummary?.totalAmount),
          byCategory: expenseResult.monthlySummary?.byCategory || expenseResult.monthlySummary?.categories || [],
        },
      },
      operations: profile,
      actions: buildActions({ profile, inventory, finance }),
    };
  }
}
