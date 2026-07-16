import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useBalanceSheetViewModel() {
  const [asOfDate, setAsOfDate] = useState(todayISO);
  const query = useTenantReportQuery({ scope: 'balance-sheet', params: { asOfDate }, queryFn: () => inventoryApi.getBalanceSheet({ dateTo: asOfDate }), keepPrevious: true });

  return { asOfDate, setAsOfDate, balanceSheet: query.data || null, loading: query.isPending, error: query.error?.message || '' };
}
