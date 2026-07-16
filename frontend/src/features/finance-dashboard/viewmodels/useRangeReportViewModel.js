import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useRangeReportViewModel() {
  const today = todayISO();
  const firstOfMonth = today.slice(0, 7) + '-01';
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [appliedRange, setAppliedRange] = useState({ dateFrom: firstOfMonth, dateTo: today });
  const query = useTenantReportQuery({
    scope: 'finance-dashboard-range',
    params: appliedRange,
    queryFn: () => inventoryApi.getFinanceDashboardRange(appliedRange),
    keepPrevious: true,
  });

  function applyRange() {
    const next = { dateFrom, dateTo };
    if (appliedRange.dateFrom === dateFrom && appliedRange.dateTo === dateTo) query.refetch();
    else setAppliedRange(next);
  }

  return { dateFrom, setDateFrom, dateTo, setDateTo, data: query.data || null, loading: query.isPending, error: query.error?.message || '', applyRange };
}
