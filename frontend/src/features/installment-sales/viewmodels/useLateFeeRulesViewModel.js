import { inventoryApi } from '../../../services/inventoryApi';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useLateFeeRulesViewModel() {
  const query = useTenantReportQuery({
    scope: 'installment-late-fee-rules',
    queryFn: () => inventoryApi.listInstallmentLateFeeRules(),
  });

  return {
    rules: query.data || [],
    loading: query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  };
}
