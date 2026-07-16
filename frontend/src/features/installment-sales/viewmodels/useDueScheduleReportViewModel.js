import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function addDaysIso(dateISO, days) {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function useDueScheduleReportViewModel() {
  const today = todayISO();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(addDaysIso(today, 7));
  const [appliedRange, setAppliedRange] = useState({ dateFrom: today, dateTo: addDaysIso(today, 7) });
  const query = useTenantReportQuery({
    scope: 'installment-due-schedule',
    params: appliedRange,
    queryFn: () => inventoryApi.getInstallmentDueScheduleReport(appliedRange),
    keepPrevious: true,
  });

  function applyRange() {
    if (appliedRange.dateFrom === dateFrom && appliedRange.dateTo === dateTo) query.refetch();
    else setAppliedRange({ dateFrom, dateTo });
  }

  return { dateFrom, setDateFrom, dateTo, setDateTo, data: query.data || null, loading: query.isPending, error: query.error?.message || '', applyRange };
}
