import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function defaultDateFrom() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  local.setUTCDate(local.getUTCDate() - 29);
  return local.toISOString().slice(0, 10);
}

const BREAKDOWN_LOADERS = {
  dsr: (params) => inventoryApi.getDsrProfitReport(params),
  product: (params) => inventoryApi.getProductProfitReport(params),
  customer: (params) => inventoryApi.getCustomerProfitReport(params),
  category: (params) => inventoryApi.getCategoryProfitReport(params),
};

export function useProfitViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayISO);
  const [view, setView] = useState('daily');
  const [tab, setTab] = useState('overview');
  const filters = { dateFrom, dateTo };
  const reportQuery = useTenantReportQuery({
    scope: 'profit-overview',
    params: filters,
    queryFn: () => inventoryApi.getProfitReport(filters),
    keepPrevious: true,
  });
  const breakdownQuery = useTenantReportQuery({
    scope: `profit-${tab}`,
    params: filters,
    enabled: Boolean(BREAKDOWN_LOADERS[tab]),
    queryFn: () => BREAKDOWN_LOADERS[tab](filters),
  });
  const breakdowns = BREAKDOWN_LOADERS[tab] && breakdownQuery.data ? { [tab]: breakdownQuery.data } : {};

  return {
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    view,
    setView,
    tab,
    setTab,
    report: reportQuery.data || null,
    loading: reportQuery.isPending,
    error: reportQuery.error?.message || '',
    breakdowns,
    breakdownLoading: breakdownQuery.isPending && Boolean(BREAKDOWN_LOADERS[tab]),
    breakdownError: breakdownQuery.error?.message || '',
  };
}
