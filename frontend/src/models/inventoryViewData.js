import { formatNumber, getPreferredLanguage } from '../utils/calculations';
import { getCssVar } from '../utils/theme.js';

const getSecondary = () => getCssVar('--secondary', '#5e5b8e');

function isBangla(language) {
  return language === 'bn';
}

function localize(language, en, bn) {
  return isBangla(language) ? bn : en;
}

export function getSettlementFor(settlements, date, dsrId) {
  return settlements.find((settlement) => settlement.date === date && settlement.dsrId === dsrId);
}

export function aggregateIssuesFor(issues, products, date, dsrId, language = getPreferredLanguage()) {
  if (!date || !dsrId) {
    return { rows: [], issueIds: [], totalIssuedPieces: 0, totalIssuedValue: 0 };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const rows = new Map();
  const issueIds = [];

  issues
    .filter((issue) => issue.date === date && issue.dsrId === dsrId)
    .forEach((issue) => {
      issueIds.push(issue.id);
      issue.items.forEach((item) => {
        const currentProduct = productMap.get(item.productId);
        const rate = Number(item.rate || currentProduct?.wholesalePrice || 0);
        const key = `${item.productId}-${rate}`;
        const existing = rows.get(key) || {
          key,
          productId: item.productId,
          productName: item.productName || currentProduct?.name || localize(language, 'Archived product', 'সংরক্ষিত পণ্য'),
          piecesPerCase: item.piecesPerCase || currentProduct?.piecesPerCase || 1,
          issuedPieces: 0,
          rate,
        };

        existing.issuedPieces += Number(item.issuedPieces || 0);
        rows.set(key, existing);
      });
    });

  const aggregatedRows = Array.from(rows.values());
  return {
    rows: aggregatedRows,
    issueIds,
    totalIssuedPieces: aggregatedRows.reduce((sum, item) => sum + item.issuedPieces, 0),
    totalIssuedValue: aggregatedRows.reduce((sum, item) => sum + item.issuedPieces * item.rate, 0),
  };
}

export function getDsrSnapshot(dsrs, issues, settlements, dsrId, date, language = getPreferredLanguage()) {
  const current = dsrs.find((dsr) => dsr.id === dsrId);
  if (current) {
    return { dsrName: current.name, area: current.area, phone: current.phone, status: current.status };
  }

  const settlement = settlements.find((item) => item.dsrId === dsrId && (!date || item.date === date));
  if (settlement) {
    return {
      dsrName: settlement.dsrName || localize(language, 'Archived DSR', 'সংরক্ষিত ডিএসআর'),
      area: settlement.area || '-',
      phone: settlement.phone || '-',
      status: localize(language, 'Archived', 'সংরক্ষিত'),
    };
  }

  const issue = issues.find((item) => item.dsrId === dsrId && (!date || item.date === date));
  return {
    dsrName: issue?.dsrName || localize(language, 'Archived DSR', 'সংরক্ষিত ডিএসআর'),
    area: issue?.area || '-',
    phone: issue?.phone || '-',
    status: localize(language, 'Archived', 'সংরক্ষিত'),
  };
}

export function buildSheetData({ date, dsrId, dsrs, issues, settlements, products, tenantName, language = getPreferredLanguage() }) {
  const aggregate = aggregateIssuesFor(issues, products, date, dsrId, language);
  const settlement = getSettlementFor(settlements, date, dsrId);
  const dsr = getDsrSnapshot(dsrs, issues, settlements, dsrId, date, language);
  const status = settlement ? 'Completed' : aggregate.issueIds.length > 0 ? 'Pending' : 'No Issue';
  const productMap = new Map(products.map((product) => [product.id, product]));
  const items = settlement
    ? settlement.items.map((item) => {
        const returnedPieces = Number(item.returnedPieces || 0);
        const damagedPieces = Number(item.damagedPieces || 0);
        const rate = Number(item.rate || 0);
        return {
          ...item,
          returnValue: (returnedPieces + damagedPieces) * rate,
        };
      })
    : aggregate.rows.map((row) => ({
        ...row,
        returnedPieces: 0,
        damagedPieces: 0,
        soldPieces: 0,
        payable: 0,
        returnValue: 0,
      }));
  const extraReturns = settlement
    ? (settlement.extraReturns || []).map((item) => {
        const product = productMap.get(item.productId);
        const returnedPieces = Number(item.returnedPieces || 0);
        const damagedPieces = Number(item.damagedPieces || 0);
        const rate = Number(item.rate || product?.wholesalePrice || 0);
        return {
          ...item,
          productName: item.productName || product?.name || localize(language, 'Archived product', 'সংরক্ষিত পণ্য'),
          piecesPerCase: item.piecesPerCase || product?.piecesPerCase || 1,
          returnedPieces,
          damagedPieces,
          rate,
          returnValue: Number(item.returnValue || 0) || (returnedPieces + damagedPieces) * rate,
        };
      })
    : [];
  const issuedReturnValue = items.reduce((sum, item) => sum + Number(item.returnValue || 0), 0);
  const extraReturnValue = settlement ? settlement.extraReturnValue || 0 : 0;
  const totalPayable = settlement ? settlement.totalPayable : 0;
  const totalSrHandovers = settlement
    ? (settlement.srHandovers || []).reduce((sum, h) => sum + Number(h.amount || 0), 0)
    : 0;

  return {
    businessName: tenantName || 'Arinda Enterprise',
    date,
    dsrId,
    dsrName: dsr.dsrName,
    area: dsr.area,
    phone: dsr.phone,
    status,
    items,
    extraReturns,
    grossIssueValue: totalPayable + issuedReturnValue,
    totalPayable,
    previousDue: settlement ? settlement.previousDue || 0 : 0,
    discount: settlement ? settlement.discount || 0 : 0,
    issuedReturnValue,
    extraReturnValue,
    totalReturnValue: issuedReturnValue + extraReturnValue,
    amountPaid: settlement ? settlement.amountPaid || 0 : 0,
    srHandovers: settlement ? (settlement.srHandovers || []) : [],
    todayDue: settlement ? Math.max(0, (settlement.totalPayable || 0) - (settlement.discount || 0) - extraReturnValue - totalSrHandovers - (settlement.amountPaid || 0)) : 0,
    totalReceivable: settlement
      ? Math.max(0, (settlement.totalPayable || 0) + (settlement.previousDue || 0) - (settlement.discount || 0) - extraReturnValue - totalSrHandovers)
      : 0,
    dueAmount: settlement ? settlement.dueAmount || 0 : 0,
  };
}

export function buildDailyRows({ date, dsrs, issues, settlements, products, dueLedgerEntries = [], language = getPreferredLanguage() }) {
  const ids = new Set(dsrs.map((dsr) => dsr.id));
  issues.filter((issue) => issue.date === date).forEach((issue) => ids.add(issue.dsrId));
  settlements.filter((settlement) => settlement.date === date).forEach((settlement) => ids.add(settlement.dsrId));

  // Manual due collections recorded on this date (paid via due ledger, not at settlement time)
  const manualCollectionsByDsr = new Map();
  dueLedgerEntries
    .filter((e) => e.type === 'COLLECTION' && e.referenceType === 'manual_settlement')
    .forEach((e) => {
      manualCollectionsByDsr.set(e.dsrId, (manualCollectionsByDsr.get(e.dsrId) || 0) + e.credit);
    });

  return Array.from(ids).map((dsrId) => {
    const dsr = getDsrSnapshot(dsrs, issues, settlements, dsrId, date, language);
    const aggregate = aggregateIssuesFor(issues, products, date, dsrId, language);
    const settlement = getSettlementFor(settlements, date, dsrId);
    const returnedPieces = settlement ? settlement.items.reduce((sum, item) => sum + Number(item.returnedPieces || 0), 0) : 0;
    const soldPieces = settlement ? settlement.items.reduce((sum, item) => sum + Number(item.soldPieces || 0), 0) : 0;
    const totalPayable = settlement ? settlement.totalPayable : 0;
    const previousDue = settlement ? Number(settlement.previousDue || 0) : 0;
    const settlementPaid = settlement ? Number(settlement.amountPaid || 0) : 0;
    const manualCollected = manualCollectionsByDsr.get(dsrId) || 0;
    const amountPaid = settlementPaid + manualCollected;
    const dueAmount = settlement ? Number(settlement.dueAmount || 0) : 0;
    const status = settlement ? 'Completed' : aggregate.issueIds.length > 0 ? 'Pending' : 'No Issue';
    const returnValue = settlement
      ? settlement.items.reduce((sum, item) => sum + (Number(item.returnedPieces || 0) + Number(item.damagedPieces || 0)) * Number(item.rate || 0), 0)
      : 0;

    return {
      dsrId,
      ...dsr,
      issuedPieces: aggregate.totalIssuedPieces,
      issuedValue: aggregate.totalIssuedValue,
      returnedPieces,
      returnValue,
      soldPieces,
      totalPayable,
      previousDue,
      amountPaid,
      dueAmount,
      status,
    };
  });
}

export function statusTone(status) {
  if (status === 'Completed' || status === 'Active') return 'emerald';
  if (status === 'Pending' || status === 'Issued') return 'amber';
  if (status === 'Inactive') return 'rose';
  return 'slate';
}

export function actionTone(actionType = '') {
  if (actionType.includes('delete')) {
    return 'rose';
  }
  if (actionType.includes('create') || actionType.includes('restore') || actionType.includes('login')) {
    return 'emerald';
  }
  if (actionType.includes('update') || actionType.includes('adjustment') || actionType.includes('logout')) {
    return 'amber';
  }
  return 'slate';
}

export function paymentStatusOf(receipt) {
  if (Number(receipt.dueAmount || 0) <= 0) return 'PAID';
  if (Number(receipt.paidAmount || 0) > 0) return 'PARTIAL';
  return 'DUE';
}

export function paymentStatusTone(status) {
  if (status === 'PAID') return 'emerald';
  if (status === 'PARTIAL') return 'amber';
  return 'rose';
}

export function productSerialStatusTone(status) {
  if (status === 'IN_STOCK') return 'emerald';
  if (status === 'SOLD') return 'blue';
  if (status === 'WARRANTY') return 'amber';
  if (status === 'DAMAGED' || status === 'DELETED') return 'rose';
  if (status === 'RETURNED') return 'purple';
  return 'slate';
}

export function warrantyClaimStatusTone(status) {
  if (status === 'RECEIVED' || status === 'SENT_TO_SUPPLIER') return 'amber';
  if (status === 'REPAIRED' || status === 'REPLACED' || status === 'DELIVERED') return 'emerald';
  if (status === 'REJECTED') return 'rose';
  return 'slate';
}

export function repairJobStatusTone(status) {
  if (status === 'RECEIVED') return 'slate';
  if (status === 'DIAGNOSING') return 'amber';
  if (status === 'AWAITING_PARTS') return 'orange';
  if (status === 'IN_REPAIR') return 'blue';
  if (status === 'READY') return 'emerald';
  if (status === 'DELIVERED') return 'green';
  if (status === 'CANCELLED') return 'rose';
  return 'slate';
}

export function repairJobApprovalTone(approvalStatus) {
  if (approvalStatus === 'APPROVED') return 'emerald';
  if (approvalStatus === 'DECLINED') return 'rose';
  return 'amber';
}

export function tradeInConditionTone(condition) {
  if (condition === 'EXCELLENT') return 'emerald';
  if (condition === 'GOOD') return 'blue';
  if (condition === 'FAIR') return 'amber';
  if (condition === 'POOR') return 'orange';
  if (condition === 'DAMAGED') return 'rose';
  return 'slate';
}

export function quotationStatusTone(status) {
  if (status === 'DRAFT') return 'slate';
  if (status === 'SENT') return 'blue';
  if (status === 'ACCEPTED') return 'emerald';
  if (status === 'REJECTED') return 'rose';
  if (status === 'EXPIRED') return 'amber';
  if (status === 'CONVERTED') return 'indigo';
  return 'slate';
}

function shortDate(date, language = getPreferredLanguage()) {
  if (!date) return '-';
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

export function buildTradingTrend({ issues, settlements, today, limit = 7, retailInvoices = [] }) {
  const dateSet = new Set([today]);
  issues.forEach((issue) => dateSet.add(issue.date));
  settlements.forEach((settlement) => dateSet.add(settlement.date));
  retailInvoices.forEach((inv) => inv.invoiceDate && dateSet.add(inv.invoiceDate));

  return Array.from(dateSet)
    .sort((a, b) => a.localeCompare(b))
    .slice(-limit)
    .map((date) => {
      const issueRows = issues.filter((issue) => issue.date === date);
      const settlementRows = settlements.filter((settlement) => settlement.date === date);
      const retailRows = retailInvoices.filter((inv) => inv.invoiceDate === date);
      const dsrRevenue = settlementRows.reduce((sum, s) => sum + Number(s.totalPayable || 0), 0);
      const retailRevenue = retailRows.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
      const dsrSold = settlementRows.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + Number(item.soldPieces || 0), 0), 0);
      const retailSold = retailRows.reduce((sum, inv) => sum + (inv.items || []).reduce((itemSum, item) => itemSum + Number(item.quantityPieces || 0), 0), 0);
      return {
        date,
        label: shortDate(date),
        issued: issueRows.reduce((sum, issue) => sum + issue.items.reduce((itemSum, item) => itemSum + Number(item.issuedPieces || 0), 0), 0),
        sold: dsrSold + retailSold,
        paid: dsrRevenue + retailRevenue,
      };
    });
}

function isoSubtractDays(dateISO, days) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildActivityHeatmap({ settlements, today, days = 70, language = getPreferredLanguage(), retailDailyReport = [] }) {
  if (!today) return [];

  const settlementsByDate = new Map();
  settlements.forEach((s) => {
    if (!settlementsByDate.has(s.date)) settlementsByDate.set(s.date, []);
    settlementsByDate.get(s.date).push(s);
  });

  const retailByDate = new Map(retailDailyReport.map((r) => [r.date, r]));

  const cells = [];
  let maxRevenue = 0;
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = isoSubtractDays(today, offset);
    const daySettlements = settlementsByDate.get(date) || [];
    const retail = retailByDate.get(date);

    const dsrRevenue = daySettlements.reduce((sum, s) => sum + Number(s.totalPayable || 0), 0);
    const dsrTransactions = daySettlements.length;

    const retailRevenue = retail ? Number(retail.totalAmount || 0) : 0;
    const retailTransactions = retail ? Number(retail.invoiceCount || 0) : 0;

    const revenue = dsrRevenue + retailRevenue;
    const transactions = dsrTransactions + retailTransactions;

    maxRevenue = Math.max(maxRevenue, revenue);

    cells.push({
      date,
      weekday: new Date(`${date}T00:00:00`).getDay(),
      labelDate: shortDate(date, language),
      revenue,
      transactions,
    });
  }

  return cells.map((cell) => ({ ...cell, intensity: maxRevenue ? cell.revenue / maxRevenue : 0 }));
}

export function buildCategoryInventory(products, language = getPreferredLanguage()) {
  return Array.from(
    products.reduce((map, product) => {
      const key = product.categoryId || 'uncategorized';
      const label = product.category || localize(language, 'Uncategorized', 'শ্রেণীহীন');
      const current = map.get(key) || { label, value: 0, units: 0, color: `linear-gradient(90deg, ${getCssVar('--success', '#37a864')}, ${getCssVar('--secondary', '#5e5b8e')})` };
      current.value += Number(product.stockPieces || 0) * Number(product.purchasePrice || 0);
      current.units += Number(product.stockPieces || 0);
      map.set(key, current);
      return map;
    }, new Map()).values(),
  )
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      color: [getCssVar('--secondary', '#5e5b8e'), getCssVar('--success', '#37a864'), getCssVar('--accent-orange', '#f5820f'), getCssVar('--purple', '#9b44ad'), getCssVar('--danger', '#f1454f'), getCssVar('--teal', '#0891b2')][index % 6],
      meta: `${formatNumber(item.units, language)} ${localize(language, 'pcs in stock', 'স্টকে পিস')}`,
    }));
}

export function buildRoutePerformance(rows, language = getPreferredLanguage()) {
  return rows
    .filter((row) => row.status !== localize(language, 'No Issue', 'কোনো ইস্যু নেই'))
    .sort((a, b) => b.totalPayable - a.totalPayable || b.soldPieces - a.soldPieces)
    .slice(0, 6)
    .map((row) => ({
      label: row.dsrName,
      meta: row.area,
      issued: row.issuedPieces,
      returned: row.returnedPieces,
      sold: row.soldPieces,
      totalPayable: row.totalPayable,
    }));
}

export function buildTopPayableProducts(settlements, language = getPreferredLanguage(), retailInvoices = []) {
  const map = new Map();
  for (const settlement of settlements) {
    for (const item of settlement.items) {
      const current = map.get(item.productId) || { label: item.productName, value: 0, soldPieces: 0 };
      current.value += Number(item.payable || 0);
      current.soldPieces += Number(item.soldPieces || 0);
      map.set(item.productId, current);
    }
  }
  for (const inv of retailInvoices) {
    for (const item of inv.items || []) {
      const current = map.get(item.productId) || { label: item.productName, value: 0, soldPieces: 0 };
      current.value += Number(item.lineTotal || 0);
      current.soldPieces += Number(item.quantityPieces || 0);
      map.set(item.productId, current);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      meta: `${formatNumber(item.soldPieces, language)} ${localize(language, 'pcs sold', 'পিস বিক্রি')}`,
      color: [getCssVar('--success', '#37a864'), getCssVar('--secondary', '#5e5b8e'), getCssVar('--accent-orange', '#f5820f'), getCssVar('--purple', '#9b44ad'), getCssVar('--rose', '#e11d48')][index % 5],
    }));
}

export function buildHistoryRows({ issues, settlements, language = getPreferredLanguage() }) {
  const issueRows = issues.map((issue) => ({
    id: `issue-${issue.id}`,
    recordId: issue.id,
    type: 'Morning Issue',
    date: issue.date,
    dsrId: issue.dsrId,
    dsrName: issue.dsrName,
    area: issue.area,
    pieces: issue.items.reduce((sum, item) => sum + Number(item.issuedPieces || 0), 0),
    amount: issue.items.reduce((sum, item) => sum + Number(item.issuedPieces || 0) * Number(item.rate || 0), 0),
    status: 'Issued',
  }));
  const settlementRows = settlements.map((settlement) => ({
    id: `settlement-${settlement.id}`,
    recordId: settlement.id,
    type: 'Evening Settlement',
    date: settlement.date,
    dsrId: settlement.dsrId,
    dsrName: settlement.dsrName,
    area: settlement.area,
    pieces: settlement.items.reduce((sum, item) => sum + Number(item.soldPieces || 0), 0),
    amount: Number(settlement.totalPayable || 0),
    previousDue: Number(settlement.previousDue || 0),
    amountPaid: Number(settlement.amountPaid || 0),
    dueAmount: Number(settlement.dueAmount || 0),
    status: 'Completed',
  }));

  return [...settlementRows, ...issueRows].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return a.type.localeCompare(b.type);
  });
}
