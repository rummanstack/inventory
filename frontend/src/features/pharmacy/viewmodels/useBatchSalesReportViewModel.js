import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useBatchSalesReportViewModel({ products = [] }) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const firstOfMonth = todayISO().slice(0, 8) + '01';
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayISO());
  const [batchNumber, setBatchNumber] = useState('');
  const [productId, setProductId] = useState('');

  const filters = { dateFrom, dateTo, batchNumber, productId, page, pageSize };
  const query = useTenantReportQuery({
    scope: 'batch-sales',
    params: filters,
    queryFn: () => inventoryApi.batchSalesReport({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      batchNumber: batchNumber || undefined,
      productId: productId || undefined,
      page,
      pageSize,
    }),
    keepPrevious: true,
  });
  const result = query.data || {};
  const rows = result.items || [];
  const total = result.total || 0;

  function applyFilters() {
    setPage(1);
    if (page === 1) query.refetch();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    setPage,
    totalPages,
    loading: query.isPending,
    error: query.error?.message || '',
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
