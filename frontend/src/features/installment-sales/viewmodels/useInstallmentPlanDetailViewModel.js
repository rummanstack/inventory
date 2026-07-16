import { inventoryApi } from '../../../services/inventoryApi';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useInstallmentPlanDetailViewModel(planId) {
  const query = useTenantReportQuery({
    scope: 'installment-plan-detail',
    params: { planId },
    queryFn: () => inventoryApi.getInstallmentPlan(planId),
    enabled: Boolean(planId),
  });

  return {
    data: query.data || null,
    loading: query.isPending,
    error: query.error?.message || '',
    refresh: query.refetch,
  };
}
