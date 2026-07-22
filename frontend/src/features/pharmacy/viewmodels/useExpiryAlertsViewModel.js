import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

const WINDOW_OPTIONS = [30, 60, 90];
const DEFAULT_WINDOW_DAYS = 60;

export function useExpiryAlertsViewModel() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [withinDays, setWithinDays] = useState(DEFAULT_WINDOW_DAYS);

  const filters = { withinDays, page, pageSize };
  const query = useTenantReportQuery({
    scope: 'expiry-alerts',
    params: filters,
    queryFn: () => inventoryApi.expiryAlerts({ withinDays, page, pageSize }),
    keepPrevious: true,
  });
  const result = query.data || {};
  const rows = result.items || [];
  const total = result.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function changeWindow(days) {
    setWithinDays(days);
    setPage(1);
  }

  return {
    rows,
    total,
    page,
    setPage,
    totalPages,
    loading: query.isPending,
    error: query.error?.message || '',
    withinDays,
    changeWindow,
    windowOptions: WINDOW_OPTIONS,
  };
}
