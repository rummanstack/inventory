import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function defaultMonthStart() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function useProfitAndLossViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultMonthStart);
  const [dateTo, setDateTo] = useState(todayISO);
  const filters = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  const query = useTenantReportQuery({ scope: 'profit-and-loss', params: filters, queryFn: () => inventoryApi.getProfitAndLoss(filters), keepPrevious: true });

  return { dateFrom, setDateFrom, dateTo, setDateTo, profitAndLoss: query.data || null, loading: query.isPending, error: query.error?.message || '' };
}
