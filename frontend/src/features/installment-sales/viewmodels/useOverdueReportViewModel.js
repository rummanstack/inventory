import { inventoryApi } from '../../../services/inventoryApi';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useOverdueReportViewModel() {
  const query = useTenantReportQuery({
    scope: 'installment-overdue',
    queryFn: () => inventoryApi.getInstallmentOverdueReport(),
  });
  return { data: query.data || null, loading: query.isPending, error: query.error?.message || '', refresh: query.refetch };
}
