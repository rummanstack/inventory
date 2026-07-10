import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { buildSheetData, getDsrSnapshot } from '../../../models/inventoryViewData.js';

const PAGE_SIZE = 200;

export function useDailyReportsViewModel({ products, dsrs, today, t, tenantName }) {
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedSheet, setSelectedSheet] = useState(null);

  const [rangeIssues, setRangeIssues] = useState([]);
  const [rangeSettlements, setRangeSettlements] = useState([]);
  const [rangeDueLedger, setRangeDueLedger] = useState([]);
  const [srLedgerEntries, setSrLedgerEntries] = useState([]);
  const [purchaseRows, setPurchaseRows] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [salaryRows, setSalaryRows] = useState([]);
  const [profitTotals, setProfitTotals] = useState(null);
  const [dsrDueBalances, setDsrDueBalances] = useState([]);
  const [rangeSalesInvoices, setRangeSalesInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dateFrom || !dateTo) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setSelectedSheet(null);

      try {
        const [issuesResult, settlementsResult] = await Promise.all([
          inventoryApi.listIssues({ dateFrom, dateTo, pageSize: PAGE_SIZE }),
          inventoryApi.listSettlements({ dateFrom, dateTo, pageSize: PAGE_SIZE }),
        ]);
        if (cancelled) return;
        setRangeIssues(issuesResult.items || []);
        setRangeSettlements(settlementsResult.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRangeIssues([]);
          setRangeSettlements([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      inventoryApi.listDsrDueLedger({ dateFrom, dateTo, pageSize: PAGE_SIZE })
        .then((r) => { if (!cancelled) setRangeDueLedger(r.items || []); })
        .catch(() => { if (!cancelled) setRangeDueLedger([]); });

      inventoryApi.listSrDueLedger({ dateFrom, dateTo, pageSize: PAGE_SIZE })
        .then((r) => { if (!cancelled) setSrLedgerEntries(r.items || []); })
        .catch(() => { if (!cancelled) setSrLedgerEntries([]); });

      inventoryApi.getPurchaseReport({ dateFrom, dateTo })
        .then((r) => { if (!cancelled) setPurchaseRows(r.rows || []); })
        .catch(() => { if (!cancelled) setPurchaseRows([]); });

      inventoryApi.getExpenseRangeReport({ dateFrom, dateTo })
        .then((r) => { if (!cancelled) setExpenseSummary(r.summary || null); })
        .catch(() => { if (!cancelled) setExpenseSummary(null); });

      inventoryApi.getSalaryPaymentsRange({ dateFrom, dateTo })
        .then((r) => { if (!cancelled) setSalaryRows(r.rows || []); })
        .catch(() => { if (!cancelled) setSalaryRows([]); });

      inventoryApi.getProfitReport({ dateFrom, dateTo })
        .then((r) => { if (!cancelled) setProfitTotals(r.totals || null); })
        .catch(() => { if (!cancelled) setProfitTotals(null); });

      inventoryApi.listSalesInvoices({ dateFrom, dateTo, pageSize: 2000 })
        .then((r) => { if (!cancelled) setRangeSalesInvoices(r.items || []); })
        .catch(() => { if (!cancelled) setRangeSalesInvoices([]); });
    }

    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  useEffect(() => {
    inventoryApi.listDsrDueBalances()
      .then((data) => setDsrDueBalances(Array.isArray(data) ? data : []))
      .catch(() => setDsrDueBalances([]));
  }, []);

  const rows = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const dsrMap = new Map();

    const ensureDsr = (dsrId) => {
      if (!dsrMap.has(dsrId)) {
        const snap = getDsrSnapshot(dsrs, rangeIssues, rangeSettlements, dsrId, null);
        dsrMap.set(dsrId, {
          dsrId,
          dsrName: snap.dsrName,
          area: snap.area,
          issuedPieces: 0,
          issuedValue: 0,
          returnedPieces: 0,
          returnValue: 0,
          damagedPieces: 0,
          soldPieces: 0,
          totalPayable: 0,
          amountPaid: 0,
          discount: 0,
          srHandover: 0,
          settlementCount: 0,
        });
      }
      return dsrMap.get(dsrId);
    };

    for (const issue of rangeIssues) {
      const row = ensureDsr(issue.dsrId);
      for (const item of issue.items || []) {
        const rate = Number(item.rate || productMap.get(item.productId)?.wholesalePrice || 0);
        row.issuedPieces += Number(item.issuedPieces || 0);
        row.issuedValue += Number(item.issuedPieces || 0) * rate;
      }
    }

    for (const s of rangeSettlements) {
      const row = ensureDsr(s.dsrId);
      for (const item of s.items || []) {
        const ret = Number(item.returnedPieces || 0) + Number(item.damagedPieces || 0);
        row.returnedPieces += Number(item.returnedPieces || 0);
        row.returnValue += ret * Number(item.rate || 0);
        row.damagedPieces += Number(item.damagedPieces || 0);
        row.soldPieces += Number(item.soldPieces || 0);
      }
      row.totalPayable += Number(s.totalPayable || 0);
      row.amountPaid += Number(s.amountPaid || 0);
      row.discount += Number(s.discount || 0);
      row.srHandover += (s.srHandovers || []).reduce((sum, h) => sum + Number(h.amount || 0), 0);
      row.settlementCount += 1;
    }

    for (const e of rangeDueLedger) {
      if (e.type === 'COLLECTION' && e.referenceType === 'manual_settlement') {
        const row = dsrMap.get(e.dsrId);
        if (row) row.amountPaid += Number(e.credit || 0);
      }
    }

    return [...dsrMap.values()]
      .filter((r) => r.issuedPieces > 0 || r.totalPayable > 0)
      .sort((a, b) => b.totalPayable - a.totalPayable);
  }, [dsrs, rangeIssues, rangeSettlements, rangeDueLedger, products]);

  const totals = useMemo(() => rows.reduce(
    (sum, row) => ({
      issuedPieces: sum.issuedPieces + row.issuedPieces,
      issuedValue: sum.issuedValue + row.issuedValue,
      returnedPieces: sum.returnedPieces + row.returnedPieces,
      returnValue: sum.returnValue + row.returnValue,
      damagedPieces: sum.damagedPieces + row.damagedPieces,
      soldPieces: sum.soldPieces + row.soldPieces,
      totalPayable: sum.totalPayable + row.totalPayable,
      amountPaid: sum.amountPaid + row.amountPaid,
      discount: sum.discount + row.discount,
      srHandover: sum.srHandover + row.srHandover,
    }),
    { issuedPieces: 0, issuedValue: 0, returnedPieces: 0, returnValue: 0, damagedPieces: 0, soldPieces: 0, totalPayable: 0, amountPaid: 0, discount: 0, srHandover: 0 },
  ), [rows]);

  const srRows = useMemo(() => {
    const srMap = new Map();
    for (const e of srLedgerEntries) {
      const existing = srMap.get(e.srId) || { srId: e.srId, srName: e.srName || '-', handover: 0, collected: 0 };
      if (e.type === 'HANDOVER') existing.handover += Number(e.debit || 0);
      if (e.type === 'COLLECTION') existing.collected += Number(e.credit || 0);
      srMap.set(e.srId, existing);
    }
    return [...srMap.values()].sort((a, b) => b.handover - a.handover);
  }, [srLedgerEntries]);

  // Due created within the selected range, split by who owes it. The DSR and
  // SR parts are netted straight from their due ledgers (debit − credit over
  // the range) so the card always reconciles with the ledger tables on this
  // page — settlement arithmetic misses opening dues, edit adjustments, and
  // extra returns. Customer part is unpaid balance on the range's invoices.
  const dueBreakdown = useMemo(() => {
    const net = (entries) => entries.reduce((sum, e) => sum + Number(e.debit || 0) - Number(e.credit || 0), 0);
    const dsrDue = Math.max(0, net(rangeDueLedger));
    const srDue = Math.max(0, net(srLedgerEntries));
    const customerDue = rangeSalesInvoices.reduce((sum, inv) => sum + Math.max(0, Number(inv.dueAmount || 0)), 0);
    return { dsrDue, srDue, customerDue, total: dsrDue + srDue + customerDue };
  }, [rangeDueLedger, srLedgerEntries, rangeSalesInvoices]);

  const expenseRows = useMemo(
    () => expenseSummary?.byCategory || [],
    [expenseSummary],
  );

  const dsrDueBalanceRows = useMemo(
    () => dsrDueBalances.filter((row) => row.balance > 0),
    [dsrDueBalances],
  );

  // Product-wise sell for the selected range — combines DSR settlement items
  // (soldPieces/rate/payable, no per-item cost snapshot so cost falls back to
  // the product's current purchase price) with retail sales invoice items
  // (which do carry a costPriceSnapshot from time of sale).
  const productRows = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const rowsByProduct = new Map();

    const ensureRow = (productId, productName) => {
      if (!rowsByProduct.has(productId)) {
        rowsByProduct.set(productId, {
          productId,
          productName: productName || productMap.get(productId)?.name || '-',
          quantitySold: 0,
          revenue: 0,
          cost: 0,
        });
      }
      return rowsByProduct.get(productId);
    };

    for (const settlement of rangeSettlements) {
      for (const item of settlement.items || []) {
        if (!item.productId) continue;
        const row = ensureRow(item.productId, item.productName);
        row.quantitySold += Number(item.soldPieces || 0);
        row.revenue += Number(item.payable || 0);
        row.cost += Number(item.soldPieces || 0) * Number(productMap.get(item.productId)?.purchasePrice || 0);
      }
    }

    for (const invoice of rangeSalesInvoices) {
      for (const item of invoice.items || []) {
        if (!item.productId) continue;
        const row = ensureRow(item.productId, item.productName);
        row.quantitySold += Number(item.quantityPieces || 0);
        row.revenue += Number(item.lineTotal || 0);
        row.cost += Number(item.quantityPieces || 0) * Number(item.costPriceSnapshot ?? productMap.get(item.productId)?.purchasePrice ?? 0);
      }
    }

    return [...rowsByProduct.values()]
      .map((row) => ({ ...row, profit: row.revenue - row.cost }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [rangeSettlements, rangeSalesInvoices, products]);

  const dueCollectionRows = useMemo(() => {
    const collections = rangeDueLedger.filter((e) => e.type === 'COLLECTION' && e.referenceType === 'manual_settlement');
    const byDsr = new Map();
    collections.forEach((e) => {
      const existing = byDsr.get(e.dsrId) || { dsrId: e.dsrId, dsrName: e.dsrName || '-', area: e.dsrArea || '-', total: 0 };
      existing.total += Number(e.credit || 0);
      byDsr.set(e.dsrId, existing);
    });
    return [...byDsr.values()].sort((a, b) => b.total - a.total);
  }, [rangeDueLedger]);

  // Everything the single-day "Daily Close" panel needs, derived from data the
  // page already fetches. Cash figures are kept separate from `totals.amountPaid`,
  // which mixes settlement cash with manual due collections.
  const dailyClose = useMemo(() => {
    const settlementCash = rangeSettlements.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);
    const dueCollected = dueCollectionRows.reduce((sum, r) => sum + r.total, 0);
    const srCollected = srRows.reduce((sum, r) => sum + r.collected, 0);
    const expensesTotal = (expenseSummary?.byCategory || []).reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const salaryTotal = salaryRows.reduce((sum, r) => sum + Number(r.totalPaid || 0), 0);
    const purchasesTotal = purchaseRows.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const purchasesPaid = purchaseRows.reduce((sum, r) => sum + Number(r.paidAmount || 0), 0);

    const cashIn = settlementCash + dueCollected + srCollected;
    const cashOut = expensesTotal + salaryTotal + purchasesPaid;

    const newDue = Math.max(0, totals.totalPayable - totals.discount - settlementCash);
    const outstandingDue = dsrDueBalances.reduce((sum, r) => sum + Math.max(0, Number(r.balance || 0)), 0);

    const settledDsrIds = new Set(rangeSettlements.map((s) => s.dsrId));
    const unsettledDsrs = rows.filter((r) => r.issuedPieces > 0 && !settledDsrIds.has(r.dsrId));

    const settlementsWithDue = rangeSettlements.filter(
      (s) => Number(s.totalPayable || 0) - Number(s.discount || 0) - Number(s.amountPaid || 0) > 0,
    ).length;

    const stockPiecesNow = products.reduce((sum, p) => sum + Number(p.stockPieces || 0), 0);
    const stockValueNow = products.reduce((sum, p) => sum + Number(p.stockPieces || 0) * Number(p.purchasePrice || 0), 0);

    return {
      settlementCash,
      dueCollected,
      srCollected,
      expensesTotal,
      salaryTotal,
      purchasesTotal,
      purchasesPaid,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut,
      newDue,
      outstandingDue,
      unsettledDsrs,
      settlementsWithDue,
      stockPiecesNow,
      stockValueNow,
      allClear: unsettledDsrs.length === 0 && settlementsWithDue === 0 && totals.damagedPieces === 0,
    };
  }, [rangeSettlements, dueCollectionRows, srRows, expenseSummary, salaryRows, purchaseRows, totals, dsrDueBalances, rows, products]);

  function viewSheet(row) {
    if (dateFrom !== dateTo) return;
    setSelectedSheet(buildSheetData({
      date: dateFrom,
      dsrId: row.dsrId,
      dsrs,
      issues: rangeIssues,
      settlements: rangeSettlements,
      products,
      tenantName,
    }));
  }

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isSingleDay: dateFrom === dateTo,
    loading,
    error,
    rows,
    totals,
    dueBreakdown,
    srRows,
    expenseRows,
    salaryRows,
    productRows,
    profitTotals,
    selectedSheet,
    viewSheet,
    dueCollectionRows,
    dsrDueBalanceRows,
    dailyClose,
  };
}
