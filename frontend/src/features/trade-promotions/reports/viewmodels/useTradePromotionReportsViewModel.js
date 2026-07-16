import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { useTenantReportQuery } from '../../../reports/queries/useTenantReportQuery.js';

const PAGE_SIZE = 20;

const PAGED_TABS = new Set(['pending', 'settled']);

export function useTradePromotionReportsViewModel() {
  const [tab, setTab] = useState('pending');
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tab, supplierId, productId, dateFrom, dateTo]);

  const filters = {
    supplierId: supplierId || undefined,
    productId: productId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
  const query = useTenantReportQuery({
    scope: 'trade-promotions',
    params: { tab, ...filters, page: PAGED_TABS.has(tab) ? page : undefined },
    queryFn: async () => {
      if (tab === 'pending') return inventoryApi.getTradePromotionPendingReport({ ...filters, page, pageSize: PAGE_SIZE });
      if (tab === 'settled') return inventoryApi.getTradePromotionSettledReport({ ...filters, page, pageSize: PAGE_SIZE });
      if (tab === 'supplier') return inventoryApi.getTradePromotionSupplierSummary(filters);
      if (tab === 'product') return inventoryApi.getTradePromotionProductSummary(filters);
      return inventoryApi.getTradePromotionDateWiseReport(filters);
    },
  });
  const result = query.data;
  const items = Array.isArray(result) ? result : (result?.items || []);
  const total = Array.isArray(result) ? items.length : (result?.total ?? items.length);
  const totalPages = Array.isArray(result) ? 0 : (result?.totalPages || 0);

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
    loading: query.isPending,
    error: query.error?.message || '',
  };
}
