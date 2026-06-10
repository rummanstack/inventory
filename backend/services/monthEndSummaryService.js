import { normalizeIsoMonth, startOfMonth, startOfNextMonth } from "../lib/dateRanges.js";

function sumByDsr(rows, amountKey, dateKey = null) {
  const map = new Map();

  for (const row of rows) {
    const current = map.get(row.dsr_id) || { count: 0, amount: 0, lastDate: "" };
    current.count += 1;
    current.amount += Number(row[amountKey] || 0);
    if (dateKey && row[dateKey] && row[dateKey] > current.lastDate) {
      current.lastDate = row[dateKey];
    }
    map.set(row.dsr_id, current);
  }

  return map;
}

function buildRow(dsr, settlementStats, cashStats, advanceStats) {
  const totalPayable = Number(settlementStats?.amount || 0);
  const totalDiscount = Number(settlementStats?.discount || 0);
  const totalExtraReturn = Number(settlementStats?.extraReturn || 0);
  const totalPaidAtSettlement = Number(settlementStats?.paid || 0);
  const totalCashReceived = Number(cashStats?.amount || 0);
  const totalAdvance = Number(advanceStats?.amount || 0);

  // Net sell = what DSR actually owes after discount and extra returns
  const netSell = totalPayable - totalDiscount - totalExtraReturn;
  // Remaining due = net owed minus what was already paid (at settlement + separate cash receipts)
  const remainingDue = netSell - totalPaidAtSettlement - totalCashReceived;
  // Net balance = still-unpaid balance plus any advances given to the DSR
  const netBalance = remainingDue + totalAdvance;

  return {
    dsrId: dsr.id,
    dsrName: dsr.name,
    dsrArea: dsr.area,
    dsrPhone: dsr.phone,
    dsrStatus: dsr.status,
    settlementCount: settlementStats?.count || 0,
    cashReceiptCount: cashStats?.count || 0,
    advanceCount: advanceStats?.count || 0,
    totalPayable,
    totalDiscount,
    totalExtraReturn,
    netSell,
    totalPaidAtSettlement,
    totalSettlementPaid: totalPaidAtSettlement,
    totalCashReceived,
    totalAdvance,
    remainingDue,
    netBalance,
    latestSettlementDate: settlementStats?.lastDate || "",
    latestCashReceiptDate: cashStats?.lastDate || "",
    latestAdvanceDate: advanceStats?.lastDate || "",
  };
}

export class MonthEndSummaryService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getSummary(query = {}, actor) {
    const month = normalizeIsoMonth(query.month, new Date().toISOString().slice(0, 7));
    const monthStart = startOfMonth(month);
    const nextMonthStart = startOfNextMonth(month);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [dsrsResult, settlementsResult, cashResult, advancesResult, expensesResult] = await Promise.all([
        client.query("SELECT id, name, phone, area, status FROM dsrs WHERE tenant_id = $1 ORDER BY name ASC", [
          tenantId,
        ]),
        client.query(
          `SELECT dsr_id, settlement_date, total_payable, discount, extra_return_value, amount_paid
           FROM settlements
           WHERE tenant_id = $1 AND settlement_date >= $2 AND settlement_date < $3`,
          [tenantId, monthStart, nextMonthStart],
        ),
        client.query(
          `SELECT dsr_id, receipt_date, amount
           FROM dsr_cash_receipts
           WHERE tenant_id = $1 AND receipt_date >= $2 AND receipt_date < $3`,
          [tenantId, monthStart, nextMonthStart],
        ),
        client.query(
          `SELECT dsr_id, advance_date, amount
           FROM dsr_advances
           WHERE tenant_id = $1 AND advance_date >= $2 AND advance_date < $3`,
          [tenantId, monthStart, nextMonthStart],
        ),
        client.query(
          `SELECT COALESCE(SUM(amount), 0)::NUMERIC AS total
           FROM expenses
           WHERE tenant_id = $1 AND expense_date >= $2 AND expense_date < $3`,
          [tenantId, monthStart, nextMonthStart],
        ),
      ]);

      const settlementMap = new Map();
      for (const row of settlementsResult.rows) {
        const current = settlementMap.get(row.dsr_id) || {
          count: 0,
          amount: 0,
          discount: 0,
          extraReturn: 0,
          paid: 0,
          lastDate: "",
        };
        current.count += 1;
        current.amount += Number(row.total_payable || 0);
        current.discount += Number(row.discount || 0);
        current.extraReturn += Number(row.extra_return_value || 0);
        current.paid += Number(row.amount_paid || 0);
        if (row.settlement_date && row.settlement_date > current.lastDate) {
          current.lastDate = row.settlement_date;
        }
        settlementMap.set(row.dsr_id, current);
      }

      const cashMap = sumByDsr(cashResult.rows, "amount", "receipt_date");
      const advanceMap = sumByDsr(advancesResult.rows, "amount", "advance_date");
      const totalExpenses = Number(expensesResult.rows[0]?.total || 0);

      const rows = dsrsResult.rows.map((dsr) =>
        buildRow(dsr, settlementMap.get(dsr.id), cashMap.get(dsr.id), advanceMap.get(dsr.id)),
      );

      rows.sort((left, right) => right.netBalance - left.netBalance || right.totalPayable - left.totalPayable);

      const totals = rows.reduce(
        (sum, row) => ({
          settlementCount: sum.settlementCount + row.settlementCount,
          cashReceiptCount: sum.cashReceiptCount + row.cashReceiptCount,
          advanceCount: sum.advanceCount + row.advanceCount,
          totalPayable: sum.totalPayable + row.totalPayable,
          totalDiscount: sum.totalDiscount + row.totalDiscount,
          totalExtraReturn: sum.totalExtraReturn + row.totalExtraReturn,
          netSell: sum.netSell + row.netSell,
          totalPaidAtSettlement: sum.totalPaidAtSettlement + row.totalPaidAtSettlement,
          totalSettlementPaid: sum.totalSettlementPaid + row.totalSettlementPaid,
          totalCashReceived: sum.totalCashReceived + row.totalCashReceived,
          totalAdvance: sum.totalAdvance + row.totalAdvance,
          remainingDue: sum.remainingDue + row.remainingDue,
          netBalance: sum.netBalance + row.netBalance,
        }),
        {
          settlementCount: 0,
          cashReceiptCount: 0,
          advanceCount: 0,
          totalPayable: 0,
          totalDiscount: 0,
          totalExtraReturn: 0,
          netSell: 0,
          totalPaidAtSettlement: 0,
          totalSettlementPaid: 0,
          totalCashReceived: 0,
          totalAdvance: 0,
          remainingDue: 0,
          netBalance: 0,
        },
      );

      return {
        month,
        rows,
        totals,
        totalExpenses,
      };
    } finally {
      client.release();
    }
  }
}
