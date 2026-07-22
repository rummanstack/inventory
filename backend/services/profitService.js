import { assert } from "../lib/errors.js";
import { addDays, normalizeIsoDate, startOfIsoWeek } from "../lib/dateRanges.js";
import { listExpensesInRange } from "../repositories/expenseRepository.js";
import {
  listInvoiceItemProfitByProduct,
  listInvoiceProfitByCustomer,
  listProductCostMap,
  listProductDirectoryForProfit,
  listReturnItemProfitByProduct,
  listReturnProfitAdjustmentByCustomer,
  listSettlementsInRange,
  listSettlementsWithDsrInRange,
} from "../repositories/profitRepository.js";
import { getProfitReport as listRetailerSalesByDate } from "../repositories/salesInvoiceRepository.js";
import { getProfitAdjustmentsByDate } from "../repositories/salesReturnRepository.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";

function emptyTotals() {
  return { revenue: 0, cost: 0, expenses: 0, grossProfit: 0, profit: 0 };
}

function normalizeDateRange(dateFrom, dateTo) {
  const today = new Date().toISOString().slice(0, 10);
  const normalizedDateTo = normalizeIsoDate(dateTo, today, DATE_ERROR);
  const normalizedDateFrom = normalizeIsoDate(dateFrom, addDays(normalizedDateTo, -29), DATE_ERROR);
  assert(normalizedDateFrom <= normalizedDateTo, "Start date must be before or equal to end date.");
  return { normalizedDateFrom, normalizedDateTo };
}

export class ProfitService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getProfitReport({ dateFrom, dateTo }, actor) {
    const { normalizedDateFrom, normalizedDateTo } = normalizeDateRange(dateFrom, dateTo);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [settlements, productCostMap, expenses, retailerSales, returnAdjustments] = await Promise.all([
        listSettlementsInRange(client, normalizedDateFrom, normalizedDateTo, tenantId),
        listProductCostMap(client, tenantId),
        listExpensesInRange(client, normalizedDateFrom, addDays(normalizedDateTo, 1), tenantId),
        listRetailerSalesByDate(client, { tenantId, dateFrom: normalizedDateFrom, dateTo: normalizedDateTo }),
        getProfitAdjustmentsByDate(client, { tenantId, dateFrom: normalizedDateFrom, dateTo: normalizedDateTo }),
      ]);

      const dailyMap = new Map();
      for (let date = normalizedDateFrom; date <= normalizedDateTo; date = addDays(date, 1)) {
        dailyMap.set(date, emptyTotals());
      }

      for (const settlement of settlements) {
        const day = dailyMap.get(settlement.date);
        if (!day) {
          continue;
        }

        for (const item of settlement.items) {
          const soldPieces = Number(item.soldPieces || 0);
          const rate = Number(item.rate || 0);
          const { cost = 0 } = productCostMap.get(item.productId) || {};
          day.revenue += soldPieces * rate;
          day.cost += soldPieces * cost;
        }

        // Extra returns (good or damaged stock for products outside today's issue)
        // are excluded on purpose: they were never sold, so they carry no revenue
        // or cost in the profit report — good stock is simply restocked and
        // damaged stock written off elsewhere, neither is a P&L event here.
        // Discount is also excluded — it is a supplier pass-through (company
        // receives the same discount from the supplier), so it does not affect
        // company profit.
      }

      for (const expense of expenses) {
        const day = dailyMap.get(expense.date);
        if (day) {
          day.expenses += expense.amount;
        }
      }

      const retailerSaleByDate = new Map(
        retailerSales.map((s) => [String(s.date).slice(0, 10), s]),
      );
      const returnAdjByDate = new Map(
        returnAdjustments.map((e) => [String(e.date).slice(0, 10), Number(e.adjustment || 0)]),
      );

      for (const [date, day] of dailyMap) {
        const sale = retailerSaleByDate.get(date);
        const returnAdj = returnAdjByDate.get(date) || 0;

        if (sale) {
          const adjustedProfit = sale.totalProfit + returnAdj;
          day.revenue += sale.totalSales;
          day.cost += sale.totalSales - adjustedProfit;
        } else if (returnAdj !== 0) {
          day.cost += -returnAdj;
        }
      }

      const daily = [...dailyMap.entries()]
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([date, totals]) => ({
          date,
          revenue: totals.revenue,
          cost: totals.cost,
          expenses: totals.expenses,
          grossProfit: totals.revenue - totals.cost,
          profit: totals.revenue - totals.cost - totals.expenses,
        }));

      const weekly = groupRows(daily, (row) => {
        const weekStart = startOfIsoWeek(row.date);
        return { key: weekStart, weekStart, weekEnd: addDays(weekStart, 6) };
      });

      const monthly = groupRows(daily, (row) => {
        const month = row.date.slice(0, 7);
        return { key: month, month };
      });

      const totals = daily.reduce(
        (sum, row) => ({
          revenue: sum.revenue + row.revenue,
          cost: sum.cost + row.cost,
          expenses: sum.expenses + row.expenses,
          grossProfit: sum.grossProfit + row.grossProfit,
          profit: sum.profit + row.profit,
        }),
        emptyTotals(),
      );

      return { dateFrom: normalizedDateFrom, dateTo: normalizedDateTo, daily, weekly, monthly, totals };
    });
  }

  // Per-dimension breakdowns show gross profit (revenue - cost of goods sold) only.
  // Operating expenses (the `expenses` table) aren't attributable to a single DSR/
  // product/customer/category, so allocating them per row would be arbitrary — net
  // profit (gross - expenses) only makes sense at the whole-business level, which is
  // what getProfitReport above already provides.
  async getDsrProfitBreakdown({ dateFrom, dateTo }, actor) {
    const { normalizedDateFrom, normalizedDateTo } = normalizeDateRange(dateFrom, dateTo);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [settlements, productCostMap] = await Promise.all([
        listSettlementsWithDsrInRange(client, normalizedDateFrom, normalizedDateTo, tenantId),
        listProductCostMap(client, tenantId),
      ]);

      const dsrMap = new Map();
      for (const settlement of settlements) {
        const row = dsrMap.get(settlement.dsrId) || { dsrId: settlement.dsrId, dsrName: settlement.dsrName, revenue: 0, cost: 0 };

        for (const item of settlement.items) {
          const soldPieces = Number(item.soldPieces || 0);
          const rate = Number(item.rate || 0);
          const { cost = 0 } = productCostMap.get(item.productId) || {};
          row.revenue += soldPieces * rate;
          row.cost += soldPieces * cost;
        }

        // Extra returns are excluded — see getProfitReport above for why.
        dsrMap.set(settlement.dsrId, row);
      }

      const rows = [...dsrMap.values()]
        .map((row) => ({ ...row, grossProfit: row.revenue - row.cost }))
        .sort((left, right) => right.grossProfit - left.grossProfit);

      return { dateFrom: normalizedDateFrom, dateTo: normalizedDateTo, rows };
    });
  }

  async getProductProfitBreakdown({ dateFrom, dateTo }, actor) {
    const { normalizedDateFrom, normalizedDateTo } = normalizeDateRange(dateFrom, dateTo);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [settlements, productCostMap, invoiceItems, returnItems, productDirectory] = await Promise.all([
        listSettlementsWithDsrInRange(client, normalizedDateFrom, normalizedDateTo, tenantId),
        listProductCostMap(client, tenantId),
        listInvoiceItemProfitByProduct(client, { tenantId, dateFrom: normalizedDateFrom, dateTo: normalizedDateTo }),
        listReturnItemProfitByProduct(client, { tenantId, dateFrom: normalizedDateFrom, dateTo: normalizedDateTo }),
        listProductDirectoryForProfit(client, tenantId),
      ]);

      const productMap = new Map();
      const ensureRow = (productId) => {
        if (!productMap.has(productId)) {
          productMap.set(productId, { productId, revenue: 0, cost: 0, quantity: 0 });
        }
        return productMap.get(productId);
      };

      for (const settlement of settlements) {
        for (const item of settlement.items) {
          const row = ensureRow(item.productId);
          const soldPieces = Number(item.soldPieces || 0);
          const rate = Number(item.rate || 0);
          const { cost = 0 } = productCostMap.get(item.productId) || {};
          row.revenue += soldPieces * rate;
          row.cost += soldPieces * cost;
          row.quantity += soldPieces;
        }

        // Extra returns are excluded — see getProfitReport above for why.
      }

      for (const entry of invoiceItems) {
        const row = ensureRow(entry.productId);
        row.revenue += entry.revenue;
        row.cost += entry.cost;
        row.quantity += entry.quantity;
      }

      for (const entry of returnItems) {
        const row = ensureRow(entry.productId);
        row.revenue -= entry.revenue;
        row.cost -= entry.cost;
        row.quantity -= entry.quantity;
      }

      const directoryMap = new Map(productDirectory.map((product) => [product.id, product]));
      const rows = [...productMap.values()]
        .map((row) => {
          const product = directoryMap.get(row.productId);
          return {
            productId: row.productId,
            productName: product?.name || row.productId || "Custom / non-catalog items",
            categoryId: product?.categoryId || null,
            categoryName: product?.categoryName || null,
            quantity: row.quantity,
            revenue: row.revenue,
            cost: row.cost,
            grossProfit: row.revenue - row.cost,
          };
        })
        .sort((left, right) => right.grossProfit - left.grossProfit);

      return { dateFrom: normalizedDateFrom, dateTo: normalizedDateTo, rows };
    });
  }

  async getCategoryProfitBreakdown(params, actor) {
    const productBreakdown = await this.getProductProfitBreakdown(params, actor);

    const categoryMap = new Map();
    for (const row of productBreakdown.rows) {
      const key = row.categoryId || "__UNCATEGORIZED__";
      const entry = categoryMap.get(key) || {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        revenue: 0,
        cost: 0,
        quantity: 0,
      };
      entry.revenue += row.revenue;
      entry.cost += row.cost;
      entry.quantity += row.quantity;
      categoryMap.set(key, entry);
    }

    const rows = [...categoryMap.values()]
      .map((row) => ({ ...row, grossProfit: row.revenue - row.cost }))
      .sort((left, right) => right.grossProfit - left.grossProfit);

    return { dateFrom: productBreakdown.dateFrom, dateTo: productBreakdown.dateTo, rows };
  }

  // customer_id/customer_name_snapshot come straight from sales_invoices — DSR
  // settlements aren't tied to an individual shop within a settlement, so this
  // dimension only covers the registered-customer retail/wholesale channel.
  async getCustomerProfitBreakdown({ dateFrom, dateTo }, actor) {
    const { normalizedDateFrom, normalizedDateTo } = normalizeDateRange(dateFrom, dateTo);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [invoiceRows, returnAdjustments] = await Promise.all([
        listInvoiceProfitByCustomer(client, { tenantId, dateFrom: normalizedDateFrom, dateTo: normalizedDateTo }),
        listReturnProfitAdjustmentByCustomer(client, { tenantId, dateFrom: normalizedDateFrom, dateTo: normalizedDateTo }),
      ]);

      const adjustmentMap = new Map(returnAdjustments.map((entry) => [entry.customerId || "", entry.adjustment]));

      const rows = invoiceRows
        .map((row) => ({
          customerId: row.customerId,
          customerName: row.customerName,
          invoiceCount: row.invoiceCount,
          revenue: row.revenue,
          grossProfit: row.grossProfit + (adjustmentMap.get(row.customerId || "") || 0),
        }))
        .sort((left, right) => right.grossProfit - left.grossProfit);

      return { dateFrom: normalizedDateFrom, dateTo: normalizedDateTo, rows };
    });
  }
}

function groupRows(daily, buildGroupKey) {
  const groups = new Map();

  for (const row of daily) {
    const { key, ...groupSeed } = buildGroupKey(row);
    const group = groups.get(key) || { ...groupSeed, ...emptyTotals() };
    group.revenue += row.revenue;
    group.cost += row.cost;
    group.expenses += row.expenses;
    group.grossProfit += row.grossProfit;
    group.profit += row.profit;
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, group]) => group);
}
