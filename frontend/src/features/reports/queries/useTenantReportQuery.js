import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { reportKeys } from './reportQueries.js';

export function useTenantReportQuery({ scope, params = {}, queryFn, enabled = true, staleTime = 0, keepPrevious = false }) {
  const { tenant, user } = useInventoryApp();
  const tenantId = tenant?.id || user?.tenantId || '';

  return useQuery({
    queryKey: reportKeys.query(tenantId, scope, params),
    queryFn,
    enabled: Boolean(tenantId && enabled),
    staleTime,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
