import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useCollectionReportViewModel() {
  const today = todayISO();
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [appliedRange, setAppliedRange] = useState({ dateFrom: firstOfMonth, dateTo: today });
  const query = useTenantReportQuery({
    scope: 'installment-collections',
    params: appliedRange,
    queryFn: () => inventoryApi.getInstallmentCollectionReport(appliedRange),
    keepPrevious: true,
  });

  function applyRange() {
    if (appliedRange.dateFrom === dateFrom && appliedRange.dateTo === dateTo) query.refetch();
    else setAppliedRange({ dateFrom, dateTo });
  }

  return { dateFrom, setDateFrom, dateTo, setDateTo, data: query.data || null, loading: query.isPending, error: query.error?.message || '', applyRange };
}
