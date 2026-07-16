import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useInventoryApp } from '../app/useInventoryApp.jsx';

export const apiDataKeys = {
  all: ['api-data'],
  tenant: (tenantId) => ['api-data', tenantId || 'session-tenant'],
  query: (tenantId, scope, params = {}) => ['api-data', tenantId || 'session-tenant', scope, params],
};

export function useTenantApiQuery({
  scope,
  params = {},
  queryFn,
  enabled = true,
  staleTime = 0,
  keepPrevious = false,
  requireTenant = true,
}) {
  const { tenant, user } = useInventoryApp();
  const tenantId = tenant?.id || user?.tenantId || '';
  return useQuery({
    queryKey: apiDataKeys.query(tenantId, scope, params),
    queryFn,
    enabled: Boolean((tenantId || !requireTenant) && enabled),
    staleTime,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
