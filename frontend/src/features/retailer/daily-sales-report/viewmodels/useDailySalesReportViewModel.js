import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { todayISO } from '../../../../utils/calculations.js';
import { useTenantReportQuery } from '../../../reports/queries/useTenantReportQuery.js';

function defaultDateFrom() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  local.setUTCDate(local.getUTCDate() - 29);
  return local.toISOString().slice(0, 10);
}

export function useDailySalesReportViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayISO);
  const [saleType, setSaleType] = useState('');
  const filters = { dateFrom, dateTo, saleType: saleType || undefined };
  const query = useTenantReportQuery({
    scope: 'daily-sales',
    params: filters,
    queryFn: () => inventoryApi.getDailySalesReport(filters),
    keepPrevious: true,
  });

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    saleType,
    setSaleType,
    report: query.data || null,
    loading: query.isPending,
    error: query.error?.message || '',
  };
}
