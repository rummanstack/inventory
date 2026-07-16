import { inventoryApi } from '../../../services/inventoryApi';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useFinanceDashboardViewModel() {
  const query = useTenantReportQuery({
    scope: 'finance-dashboard',
    queryFn: () => inventoryApi.getFinanceDashboard(),
  });
  return { data: query.data || null, loading: query.isPending, error: query.error?.message || '', refresh: query.refetch };
}
