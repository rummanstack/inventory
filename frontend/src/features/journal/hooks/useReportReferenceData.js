import { useMemo } from 'react';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useReportReferenceData() {
  const query = useTenantReportQuery({
    scope: 'journal-reference-data',
    queryFn: () => inventoryApi.getReportReferenceData(),
  });
  const result = query.data || {};
  const data = {
    accounts: result.accounts || [],
    fiscalYears: result.fiscalYears || [],
    customers: result.customers || [],
    suppliers: result.suppliers || [],
    settings: result.settings || null,
  };
  const periods = useMemo(() => data.fiscalYears.flatMap((year) => year.periods || []), [data.fiscalYears]);

  return { ...data, periods, loading: query.isPending, error: query.error?.message || '' };
}
