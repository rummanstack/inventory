import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useTrialBalanceViewModel() {
  const [asOfDate, setAsOfDate] = useState(todayISO);
  const query = useTenantReportQuery({ scope: 'trial-balance', params: { asOfDate }, queryFn: () => inventoryApi.getTrialBalance({ dateTo: asOfDate }), keepPrevious: true });

  return { asOfDate, setAsOfDate, trialBalance: query.data || null, loading: query.isPending, error: query.error?.message || '' };
}
