import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { aggregateIssuesFor, buildSheetData, getSettlementFor } from '../../../models/inventoryViewData.js';
import { calculatePayable, calculateSold, createId, toPieces } from '../../../utils/calculations.js';

const SCOPED_LOOKUP_PAGE_SIZE = 10;

function toExtraReturnRow(item) {
  const piecesPerCase = Math.max(1, Number(item.piecesPerCase || 1));
  const returnedPieces = Number(item.returnedPieces || 0);
  const damagedPieces = Number(item.damagedPieces || 0);
  return {
    id: item.id || createId('extra-return'),
    productId: item.productId || '',
    productName: item.productName || '',
    piecesPerCase,
    caseQty: Math.floor(returnedPieces / piecesPerCase),
    pieceQty: returnedPieces % piecesPerCase,
    damagedCaseQty: Math.floor(damagedPieces / piecesPerCase),
    damagedPieceQty: damagedPieces % piecesPerCase,
  };
}

export function useSettlementViewModel({ products, dsrs, today, saveSettlementAction, t, tenantName }) {
  const activeDsrs = useMemo(() => dsrs.filter((dsr) => dsr.status === 'Active'), [dsrs]);
  const [date, setDate] = useState(today);
  const [dsrId, setDsrId] = useState(activeDsrs[0]?.id || '');
  const [returns, setReturns] = useState({});
  const [extraReturns, setExtraReturns] = useState([]);
  const [previousDueInput, setPreviousDueInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scopedIssues, setScopedIssues] = useState([]);
  const [scopedSettlements, setScopedSettlements] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activeDsrs.some((dsr) => dsr.id === dsrId) && activeDsrs[0]) {
      setDsrId(activeDsrs[0].id);
    }
  }, [activeDsrs, dsrId]);

  useEffect(() => {
    let cancelled = false;

    if (!date || !dsrId) {
      setScopedIssues([]);
      setScopedSettlements([]);
      return undefined;
    }

    Promise.all([
      inventoryApi.listIssues({ dsrId, dateFrom: date, dateTo: date, pageSize: SCOPED_LOOKUP_PAGE_SIZE }),
      inventoryApi.listSettlements({ dsrId, dateFrom: date, dateTo: date, pageSize: SCOPED_LOOKUP_PAGE_SIZE }),
    ])
      .then(([issuesResult, settlementsResult]) => {
        if (cancelled) {
          return;
        }

        setScopedIssues(issuesResult.items || []);
        setScopedSettlements(settlementsResult.items || []);
      })
      .catch(() => {
        if (!cancelled) {
          setScopedIssues([]);
          setScopedSettlements([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date, dsrId, refreshKey]);

  const issueData = useMemo(() => aggregateIssuesFor(scopedIssues, products, date, dsrId), [scopedIssues, products, date, dsrId]);
  const completedSettlement = getSettlementFor(scopedSettlements, date, dsrId);
  const issueKey = issueData.issueIds.join('|');

  useEffect(() => {
    if (!completedSettlement) {
      setReturns({});
      setExtraReturns([]);
      setPreviousDueInput('');
      setDiscountInput('');
      setAmountPaidInput('');
      setMessage(null);
      return;
    }

    setReturns(
      completedSettlement.items.reduce((map, item) => {
        const piecesPerCase = Number(item.piecesPerCase || 1);
        const damagedPieces = Number(item.damagedPieces || 0);
        map[`${item.productId}-${item.rate}`] = {
          caseQty: Math.floor(Number(item.returnedPieces || 0) / piecesPerCase),
          pieceQty: Number(item.returnedPieces || 0) % piecesPerCase,
          damagedCaseQty: Math.floor(damagedPieces / piecesPerCase),
          damagedPieceQty: damagedPieces % piecesPerCase,
        };
        return map;
      }, {}),
    );
    setPreviousDueInput(String(Number(completedSettlement.previousDue || 0)));
    setDiscountInput(String(Number(completedSettlement.discount || 0)));
    setAmountPaidInput(String(Number(completedSettlement.amountPaid || 0)));
    setExtraReturns((completedSettlement.extraReturns || []).map(toExtraReturnRow));
    setMessage(null);
  }, [date, dsrId, issueKey, completedSettlement?.id]);

  const displayRows = issueData.rows.map((row) => {
    const input = returns[row.key] || {};
    const returnedPieces = toPieces(input.caseQty, input.pieceQty, row.piecesPerCase);
    const damagedPieces = toPieces(input.damagedCaseQty, input.damagedPieceQty, row.piecesPerCase);
    const soldPieces = calculateSold(row.issuedPieces, returnedPieces + damagedPieces);

    return {
      ...row,
      returnedPieces,
      damagedPieces,
      soldPieces,
      payable: calculatePayable(soldPieces, row.rate),
      invalid: returnedPieces + damagedPieces > row.issuedPieces,
    };
  });

  const totalPayable = displayRows.reduce((sum, item) => sum + item.payable, 0);
  const totalExtraReturnedPieces = extraReturns.reduce((sum, item) => sum + toPieces(item.caseQty, item.pieceQty, item.piecesPerCase), 0);
  const extraReturnValue = extraReturns.reduce((sum, row) => {
    const product = products.find((p) => p.id === row.productId);
    const rate = Number(product?.sellingPrice || 0);
    const returnedPieces = toPieces(row.caseQty, row.pieceQty, row.piecesPerCase);
    const damagedPieces = toPieces(row.damagedCaseQty, row.damagedPieceQty, row.piecesPerCase);
    return sum + (returnedPieces + damagedPieces) * rate;
  }, 0);
  const previousDue = Math.max(0, Number(previousDueInput || 0));
  const discount = Math.max(0, Number(discountInput || 0));
  const receivableTotal = Math.max(0, totalPayable + previousDue - discount - extraReturnValue);
  const amountPaid = Math.min(Math.max(0, Number(amountPaidInput || 0)), receivableTotal);
  const dueAmount = Math.max(receivableTotal - amountPaid, 0);
  const todayDue = Math.max(0, totalPayable - discount - extraReturnValue - amountPaid);
  const hasInvalidReturns = displayRows.some((row) => row.invalid);
  const sheet = buildSheetData({ date, dsrId, dsrs, issues: scopedIssues, settlements: scopedSettlements, products, tenantName });

  function updateReturn(rowKey, field, value) {
    setReturns((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        [field]: value,
      },
    }));
  }

  function addExtraReturn() {
    const nextProduct = products.find((product) => !extraReturns.some((row) => row.productId === product.id));
    if (!nextProduct) {
      return;
    }

    setExtraReturns((current) => [
      ...current,
      {
        id: createId('extra-return'),
        productId: nextProduct.id,
        productName: nextProduct.name,
        piecesPerCase: Math.max(1, Number(nextProduct.piecesPerCase || 1)),
        caseQty: '',
        pieceQty: '',
        damagedCaseQty: '',
        damagedPieceQty: '',
      },
    ]);
  }

  function updateExtraReturn(rowId, field, value) {
    setExtraReturns((current) => current.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      if (field === 'productId') {
        const product = products.find((candidate) => candidate.id === value);
        if (!product) {
          return row;
        }

        return {
          ...row,
          productId: product.id,
          productName: product.name,
          piecesPerCase: Math.max(1, Number(product.piecesPerCase || 1)),
        };
      }

      return {
        ...row,
        [field]: value,
      };
    }));
  }

  function removeExtraReturn(rowId) {
    setExtraReturns((current) => current.filter((row) => row.id !== rowId));
  }

  async function completeSettlement() {
    const dsr = dsrs.find((candidate) => candidate.id === dsrId);
    if (!dsr) {
      setMessage({ type: 'error', text: t('settlement.selectValidDsr') });
      return;
    }
    if (!issueData.rows.length) {
      setMessage({ type: 'error', text: t('settlement.noMorningIssue') });
      return;
    }
    if (hasInvalidReturns) {
      setMessage({ type: 'error', text: t('settlement.returnQuantityExceeded') });
      return;
    }

    if (extraReturns.some((row) => !row.productId || toPieces(row.caseQty, row.pieceQty, row.piecesPerCase) <= 0)) {
      setMessage({ type: 'error', text: t('settlement.extraReturnInvalid') });
      return;
    }

    const items = displayRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      piecesPerCase: row.piecesPerCase,
      issuedPieces: row.issuedPieces,
      returnedPieces: row.returnedPieces,
      damagedPieces: row.damagedPieces,
      soldPieces: row.soldPieces,
      rate: row.rate,
      payable: row.payable,
    }));
    const settlement = {
      id: completedSettlement?.id,
      date,
      dsrId: dsr.id,
      dsrName: dsr.name,
      area: dsr.area,
      phone: dsr.phone,
      issueIds: issueData.issueIds,
      items,
      totalPayable: items.reduce((sum, item) => sum + item.payable, 0),
      previousDue,
      discount,
      extraReturnValue,
      amountPaid,
      dueAmount,
      status: 'Completed',
      extraReturns: extraReturns.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        piecesPerCase: row.piecesPerCase,
        returnedPieces: toPieces(row.caseQty, row.pieceQty, row.piecesPerCase),
        damagedPieces: toPieces(row.damagedCaseQty, row.damagedPieceQty, row.piecesPerCase),
      })),
    };

    setSaving(true);
    const result = await saveSettlementAction(settlement);
    setSaving(false);
    if (result.ok) {
      setMessage(null);
      setRefreshKey((key) => key + 1);
    }
  }

  return {
    activeDsrs,
    date,
    setDate,
    dsrId,
    setDsrId,
    returns,
    previousDueInput,
    setPreviousDueInput,
    discountInput,
    setDiscountInput,
    amountPaidInput,
    setAmountPaidInput,
    message,
    saving,
    completedSettlement,
    displayRows,
    extraReturns,
    totalExtraReturnedPieces,
    extraReturnValue,
    totalPayable,
    discount,
    todayDue,
    dueAmount,
    hasInvalidReturns,
    sheet,
    updateReturn,
    addExtraReturn,
    updateExtraReturn,
    removeExtraReturn,
    completeSettlement,
  };
}
