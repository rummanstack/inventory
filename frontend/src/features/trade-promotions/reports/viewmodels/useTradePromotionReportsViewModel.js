import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';

const PAGE_SIZE = 20;

const PAGED_TABS = new Set(['pending', 'settled']);

export function useTradePromotionReportsViewModel() {
  const [tab, setTab] = useState('pending');
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [tab, supplierId, productId, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const filters = {
          supplierId: supplierId || undefined,
          productId: productId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        };
        let result;
        if (tab === 'pending') {
          result = await inventoryApi.getTradePromotionPendingReport({ ...filters, page, pageSize: PAGE_SIZE });
        } else if (tab === 'settled') {
          result = await inventoryApi.getTradePromotionSettledReport({ ...filters, page, pageSize: PAGE_SIZE });
        } else if (tab === 'supplier') {
          result = await inventoryApi.getTradePromotionSupplierSummary(filters);
        } else if (tab === 'product') {
          result = await inventoryApi.getTradePromotionProductSummary(filters);
        } else {
          result = await inventoryApi.getTradePromotionDateWiseReport(filters);
        }
        if (!cancelled) {
          const rows = Array.isArray(result) ? result : (result.items || []);
          setItems(rows);
          setTotal(Array.isArray(result) ? rows.length : (result.total ?? rows.length));
          setTotalPages(Array.isArray(result) ? 0 : (result.totalPages || 0));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setItems([]);
          setTotal(0);
          setTotalPages(0);
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
  }, [tab, supplierId, productId, dateFrom, dateTo, page]);

  return {
    tab,
    setTab,
    isPaged: PAGED_TABS.has(tab),
    supplierId,
    setSupplierId,
    productId,
    setProductId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    items,
    total,
    totalPages,
    loading,
    error,
  };
}
