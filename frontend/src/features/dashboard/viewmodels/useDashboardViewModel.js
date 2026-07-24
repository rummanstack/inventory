import { inventoryApi } from '../../../services/inventoryApi.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useDashboardViewModel({ today }) {
  const query = useTenantReportQuery({
    scope: 'command-center-dashboard',
    params: { today },
    enabled: Boolean(today),
    queryFn: () => inventoryApi.getDashboard({ date: today }),
  });

  return {
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    error: query.error?.message || '',
    data: query.data || null,
    refresh: query.refetch,
  };
}
