import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { todayISO } from '../../../utils/calculations.js';

export function useBatchSalesReportViewModel({ products = [] }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firstOfMonth = todayISO().slice(0, 8) + '01';
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayISO());
  const [batchNumber, setBatchNumber] = useState('');
  const [productId, setProductId] = useState('');

  const load = useCallback(async (params) => {
    setLoading(true);
    setError('');
    try {
      const result = await inventoryApi.batchSalesReport({
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
        batchNumber: params.batchNumber || undefined,
        productId: params.productId || undefined,
        page: params.page,
        pageSize: params.pageSize,
      });
      setRows(result.items || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load batch sales report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ dateFrom, dateTo, batchNumber, productId, page, pageSize });
  }, [load, dateFrom, dateTo, batchNumber, productId, page, pageSize]);

  function applyFilters() {
    setPage(1);
    load({ dateFrom, dateTo, batchNumber, productId, page: 1, pageSize });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    batchNumber,
    setBatchNumber,
    productId,
    setProductId,
    products,
    applyFilters,
  };
}
