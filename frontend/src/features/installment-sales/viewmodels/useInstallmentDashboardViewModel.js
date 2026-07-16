import { inventoryApi } from '../../../services/inventoryApi';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useInstallmentDashboardViewModel() {
  const query = useTenantReportQuery({
    scope: 'installment-dashboard',
    queryFn: () => inventoryApi.getInstallmentDashboard(),
  });
  return { data: query.data || null, loading: query.isPending, error: query.error?.message || '', refresh: query.refetch };
}
