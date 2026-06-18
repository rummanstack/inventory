import { formatNumber } from '../utils/calculations';
import { getCssVar } from '../utils/theme.js';

const getSecondary = () => getCssVar('--secondary', '#2563eb');

export function getSettlementFor(settlements, date, dsrId) {
  return settlements.find((settlement) => settlement.date === date && settlement.dsrId === dsrId);
}

export function aggregateIssuesFor(issues, products, date, dsrId) {
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
          productName: item.productName || currentProduct?.name || 'Archived product',
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

export function getDsrSnapshot(dsrs, issues, settlements, dsrId, date) {
  const current = dsrs.find((dsr) => dsr.id === dsrId);
  if (current) {
    return { dsrName: current.name, area: current.area, phone: current.phone, status: current.status };
  }

  const settlement = settlements.find((item) => item.dsrId === dsrId && (!date || item.date === date));
  if (settlement) {
    return {
      dsrName: settlement.dsrName || 'Archived DSR',
      area: settlement.area || '-',
      phone: settlement.phone || '-',
      status: 'Archived',
    };
  }

  const issue = issues.find((item) => item.dsrId === dsrId && (!date || item.date === date));
  return {
    dsrName: issue?.dsrName || 'Archived DSR',
    area: issue?.area || '-',
    phone: issue?.phone || '-',
    status: 'Archived',
  };
}

export function buildSheetData({ date, dsrId, dsrs, issues, settlements, products, tenantName }) {
  const aggregate = aggregateIssuesFor(issues, products, date, dsrId);
  const settlement = getSettlementFor(settlements, date, dsrId);
  const dsr = getDsrSnapshot(dsrs, issues, settlements, dsrId, date);
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
          productName: item.productName || product?.name || 'Archived product',
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
    todayDue: settlement ? Math.max(0, (settlement.totalPayable || 0) - (settlement.discount || 0) - extraReturnValue - (settlement.amountPaid || 0)) : 0,
    totalReceivable: settlement
      ? Math.max(0, (settlement.totalPayable || 0) + (settlement.previousDue || 0) - (settlement.discount || 0) - extraReturnValue)
      : 0,
    dueAmount: settlement ? settlement.dueAmount || 0 : 0,
  };
}

export function buildDailyRows({ date, dsrs, issues, settlements, products }) {
  const ids = new Set(dsrs.map((dsr) => dsr.id));
  issues.filter((issue) => issue.date === date).forEach((issue) => ids.add(issue.dsrId));
  settlements.filter((settlement) => settlement.date === date).forEach((settlement) => ids.add(settlement.dsrId));

  return Array.from(ids).map((dsrId) => {
    const dsr = getDsrSnapshot(dsrs, issues, settlements, dsrId, date);
    const aggregate = aggregateIssuesFor(issues, products, date, dsrId);
    const settlement = getSettlementFor(settlements, date, dsrId);
    const returnedPieces = settlement ? settlement.items.reduce((sum, item) => sum + Number(item.returnedPieces || 0), 0) : 0;
    const soldPieces = settlement ? settlement.items.reduce((sum, item) => sum + Number(item.soldPieces || 0), 0) : 0;
    const totalPayable = settlement ? settlement.totalPayable : 0;
    const previousDue = settlement ? Number(settlement.previousDue || 0) : 0;
    const amountPaid = settlement ? Number(settlement.amountPaid || 0) : 0;
    const dueAmount = settlement ? Number(settlement.dueAmount || 0) : 0;
    const status = settlement ? 'Completed' : aggregate.issueIds.length > 0 ? 'Pending' : 'No Issue';

    return {
      dsrId,
      ...dsr,
      issuedPieces: aggregate.totalIssuedPieces,
      returnedPieces,
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

export function shortDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

export function buildTradingTrend({ issues, settlements, today, limit = 7 }) {
  const dateSet = new Set([today]);
  issues.forEach((issue) => dateSet.add(issue.date));
  settlements.forEach((settlement) => dateSet.add(settlement.date));

  return Array.from(dateSet)
    .sort((a, b) => a.localeCompare(b))
    .slice(-limit)
    .map((date) => {
      const issueRows = issues.filter((issue) => issue.date === date);
      const settlementRows = settlements.filter((settlement) => settlement.date === date);
      return {
        date,
        label: shortDate(date),
        issued: issueRows.reduce((sum, issue) => sum + issue.items.reduce((itemSum, item) => itemSum + Number(item.issuedPieces || 0), 0), 0),
        sold: settlementRows.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + Number(item.soldPieces || 0), 0), 0),
        payable: settlementRows.reduce((sum, settlement) => sum + Number(settlement.totalPayable || 0), 0),
        paid: settlementRows.reduce((sum, settlement) => sum + Number(settlement.amountPaid || 0), 0),
      };
    });
}

function isoSubtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function buildActivityHeatmap({ issues, settlements, today, days = 70 }) {
  if (!today) return [];

  const issuesByDate = new Map();
  const settlementsByDate = new Map();
  issues.forEach((issue) => {
    if (!issuesByDate.has(issue.date)) issuesByDate.set(issue.date, []);
    issuesByDate.get(issue.date).push(issue);
  });
  settlements.forEach((settlement) => {
    if (!settlementsByDate.has(settlement.date)) settlementsByDate.set(settlement.date, []);
    settlementsByDate.get(settlement.date).push(settlement);
  });

  const cells = [];
  let max = 0;
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = isoSubtractDays(today, offset);
    const dayIssues = issuesByDate.get(date) || [];
    const daySettlements = settlementsByDate.get(date) || [];
    const issued = dayIssues.length;
    const settled = daySettlements.length;
    const count = issued + settled;
    max = Math.max(max, count);

    const dsrNames = new Set([
      ...dayIssues.map((issue) => issue.dsrName).filter(Boolean),
      ...daySettlements.map((settlement) => settlement.dsrName).filter(Boolean),
    ]);
    const issuedPieces = dayIssues.reduce(
      (sum, issue) => sum + (issue.items || []).reduce((itemSum, item) => itemSum + Number(item.issuedPieces || 0), 0),
      0,
    );
    const soldPieces = daySettlements.reduce(
      (sum, settlement) => sum + (settlement.items || []).reduce((itemSum, item) => itemSum + Number(item.soldPieces || 0), 0),
      0,
    );
    const returnedPieces = daySettlements.reduce(
      (sum, settlement) => sum + (settlement.items || []).reduce((itemSum, item) => itemSum + Number(item.returnedPieces || 0), 0),
      0,
    );
    const totalPayable = daySettlements.reduce((sum, settlement) => sum + Number(settlement.totalPayable || 0), 0);
    const amountPaid = daySettlements.reduce((sum, settlement) => sum + Number(settlement.amountPaid || 0), 0);
    const dueAmount = daySettlements.reduce((sum, settlement) => sum + Number(settlement.dueAmount || 0), 0);

    cells.push({
      date,
      issued,
      settled,
      count,
      weekday: new Date(`${date}T00:00:00`).getDay(),
      dsrNames: Array.from(dsrNames),
      issuedPieces,
      soldPieces,
      returnedPieces,
      totalPayable,
      amountPaid,
      dueAmount,
    });
  }

  return cells.map((cell) => ({ ...cell, intensity: max ? cell.count / max : 0 }));
}

export function buildCategoryInventory(products) {
  return Array.from(
    products.reduce((map, product) => {
      const key = product.categoryId || 'uncategorized';
      const label = product.category || 'Uncategorized';
      const current = map.get(key) || { label, value: 0, units: 0, color: `linear-gradient(90deg, ${getCssVar('--success', '#0f766e')}, ${getCssVar('--secondary', '#2563eb')})` };
      current.value += Number(product.stockPieces || 0) * Number(product.purchasePrice || 0);
      current.units += Number(product.stockPieces || 0);
      map.set(key, current);
      return map;
    }, new Map()).values(),
  )
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      color: [getCssVar('--secondary', '#2563eb'), getCssVar('--success', '#0f766e'), getCssVar('--accent-orange', '#f97316'), getCssVar('--purple', '#7c3aed'), getCssVar('--danger', '#dc2626'), getCssVar('--teal', '#0891b2')][index % 6],
      meta: `${formatNumber(item.units)} pcs in stock`,
    }));
}

export function buildRoutePerformance(rows) {
  return rows
    .filter((row) => row.status !== 'No Issue')
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

export function buildTopPayableProducts(settlements) {
  return Array.from(
    settlements
      .flatMap((settlement) => settlement.items)
      .reduce((map, item) => {
        const current = map.get(item.productId) || { label: item.productName, value: 0, soldPieces: 0 };
        current.value += Number(item.payable || 0);
        current.soldPieces += Number(item.soldPieces || 0);
        map.set(item.productId, current);
        return map;
      }, new Map())
      .values(),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      meta: `${formatNumber(item.soldPieces)} pcs sold`,
      color: [getCssVar('--success', '#0f766e'), getCssVar('--secondary', '#2563eb'), getCssVar('--accent-orange', '#f97316'), getCssVar('--purple', '#7c3aed'), getCssVar('--rose', '#e11d48')][index % 5],
    }));
}

export function buildHistoryRows({ issues, settlements }) {
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
