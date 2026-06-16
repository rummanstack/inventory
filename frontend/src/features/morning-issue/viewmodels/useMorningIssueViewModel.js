import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { toPieces } from '../../../utils/calculations.js';

const SCOPED_LOOKUP_PAGE_SIZE = 10;

export function useMorningIssueViewModel({ products, dsrs, today, saveIssueAction, t }) {
  const activeDsrs = useMemo(() => dsrs.filter((dsr) => dsr.status === 'Active'), [dsrs]);
  const [date, setDate] = useState(today);
  const [dsrId, setDsrId] = useState(activeDsrs[0]?.id || '');
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [existingIssue, setExistingIssue] = useState(null);
  const [existingSettlement, setExistingSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activeDsrs.some((dsr) => dsr.id === dsrId) && activeDsrs[0]) {
      setDsrId(activeDsrs[0].id);
    }
  }, [activeDsrs, dsrId]);

  const selectedDsr = dsrs.find((dsr) => dsr.id === dsrId);

  useEffect(() => {
    let cancelled = false;

    if (!date || !dsrId) {
      setExistingIssue(null);
      setExistingSettlement(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    Promise.all([
      inventoryApi.listIssues({ dsrId, dateFrom: date, dateTo: date, pageSize: SCOPED_LOOKUP_PAGE_SIZE }),
      inventoryApi.listSettlements({ dsrId, dateFrom: date, dateTo: date, pageSize: SCOPED_LOOKUP_PAGE_SIZE }),
    ])
      .then(([issueResult, settlementResult]) => {
        if (cancelled) {
          return;
        }

        setExistingIssue((issueResult.items || []).find((issue) => issue.date === date && issue.dsrId === dsrId) || null);
        setExistingSettlement((settlementResult.items || []).find((settlement) => settlement.date === date && settlement.dsrId === dsrId) || null);
      })
      .catch(() => {
        if (!cancelled) {
          setExistingIssue(null);
          setExistingSettlement(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date, dsrId, refreshKey]);

  useEffect(() => {
    if (!existingIssue) {
      setQuantities({});
      return;
    }

    setQuantities(
      existingIssue.items.reduce((map, item) => {
        const piecesPerCase = Number(item.piecesPerCase || 1);
        map[item.productId] = {
          caseQty: Math.floor(Number(item.issuedPieces || 0) / piecesPerCase),
          pieceQty: Number(item.issuedPieces || 0) % piecesPerCase,
        };
        return map;
      }, {}),
    );
  }, [existingIssue?.id]);

  const issueRows = products.map((product) => {
    const quantity = quantities[product.id] || {};
    const existingItem = existingIssue?.items.find((item) => item.productId === product.id);
    const rate = Number(existingItem?.rate || product.wholesalePrice || 0);
    const issuedPieces = toPieces(quantity.caseQty, quantity.pieceQty, product.piecesPerCase);
    const availableStock = product.stockPieces + Number(existingItem?.issuedPieces || 0);

    return {
      ...product,
      availableStock,
      issuedPieces,
      rate,
      issueValue: issuedPieces * rate,
      invalid: issuedPieces > availableStock,
    };
  });

  const selectedRows = issueRows.filter((row) => row.issuedPieces > 0);
  const invalidRows = issueRows.filter((row) => row.invalid);
  const totalIssuedPieces = selectedRows.reduce((sum, row) => sum + row.issuedPieces, 0);
  const totalIssueValue = selectedRows.reduce((sum, row) => sum + row.issueValue, 0);

  function updateQuantity(productIdToUpdate, field, value) {
    setQuantities((current) => ({
      ...current,
      [productIdToUpdate]: {
        ...current[productIdToUpdate],
        [field]: value,
      },
    }));
    setMessage(null);
  }

  async function saveIssue() {
    if (!date || !selectedDsr) {
      setMessage({ type: 'error', text: t('morningIssue.selectDateAndDsr') });
      return;
    }
    if (!selectedRows.length) {
      setMessage({ type: 'error', text: t('morningIssue.enterAtLeastOne') });
      return;
    }
    if (invalidRows.length) {
      setMessage({ type: 'error', text: t('morningIssue.fixStockRows') });
      return;
    }
    if (existingSettlement) {
      setMessage({ type: 'error', text: t('morningIssue.settlementLocked') });
      return;
    }

    const issue = {
      id: existingIssue?.id,
      date,
      dsrId: selectedDsr.id,
      dsrName: selectedDsr.name,
      area: selectedDsr.area,
      phone: selectedDsr.phone,
      items: selectedRows.map((row) => ({
        productId: row.id,
        productName: row.name,
        piecesPerCase: row.piecesPerCase,
        issuedPieces: row.issuedPieces,
        rate: row.rate,
      })),
    };

    setSaving(true);
    const result = await saveIssueAction(issue);
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
    quantities,
    message,
    saving,
    existingIssue,
    existingSettlement,
    loading,
    issueRows,
    invalidRows,
    selectedRows,
    totalIssuedPieces,
    totalIssueValue,
    updateQuantity,
    saveIssue,
  };
}
