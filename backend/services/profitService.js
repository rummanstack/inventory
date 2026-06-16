import { assert } from "../lib/errors.js";
import { addDays, normalizeIsoDate, startOfIsoWeek } from "../lib/dateRanges.js";
import { listExpensesInRange } from "../repositories/expenseRepository.js";
import { listProductCostMap, listSettlementsInRange } from "../repositories/profitRepository.js";
import { getProfitReport as listRetailerSalesByDate } from "../repositories/salesInvoiceRepository.js";
import { getProfitAdjustmentsByDate } from "../repositories/salesReturnRepository.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";

function emptyTotals() {
  return { revenue: 0, cost: 0, expenses: 0, profit: 0 };
}

export class ProfitService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getProfitReport({ dateFrom, dateTo }, actor) {
    const today = new Date().toISOString().slice(0, 10);
    const normalizedDateTo = normalizeIsoDate(dateTo, today, DATE_ERROR);
    const normalizedDateFrom = normalizeIsoDate(dateFrom, addDays(normalizedDateTo, -29), DATE_ERROR);
    assert(normalizedDateFrom <= normalizedDateTo, "Start date must be before or equal to end date.");

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
          const cost = Number(productCostMap.get(item.productId) || 0);
          day.revenue += soldPieces * rate;
          day.cost += soldPieces * cost;
        }

        day.revenue -= settlement.discount + settlement.extraReturnValue;
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
          profit: sum.profit + row.profit,
        }),
        emptyTotals(),
      );

      return { dateFrom: normalizedDateFrom, dateTo: normalizedDateTo, daily, weekly, monthly, totals };
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
    group.profit += row.profit;
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, group]) => group);
}
