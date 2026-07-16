import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useQuery } from '@tanstack/react-query';

const SEARCH_DEBOUNCE_MS = 300;

export function useActivityLogsViewModel() {
  const { user } = useInventoryApp();
  const canFilterByOrg = user?.role === 'system_developer';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [module, setModule] = useState('');
  const [actionType, setActionType] = useState('');
  const debouncedActionType = useDebouncedValue(actionType.trim(), SEARCH_DEBOUNCE_MS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tenantId, setTenantId] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listActivityLogs({
      page,
      pageSize,
      search: debouncedSearch,
      module: module || undefined,
      actionType: debouncedActionType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      tenantId: canFilterByOrg ? tenantId || undefined : undefined,
    }),
    [debouncedSearch, module, debouncedActionType, dateFrom, dateTo, tenantId, canFilterByOrg],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, debouncedActionType, module, dateFrom, dateTo, tenantId, list.resetPage]);

  const tenantsQuery = useQuery({
    queryKey: ['api-data', 'activity-log-tenants'],
    queryFn: () => inventoryApi.listTenants(),
    enabled: canFilterByOrg,
    staleTime: 5 * 60_000,
  });
  const tenants = tenantsQuery.data?.tenants || tenantsQuery.data?.items || [];

  return {
    search,
    setSearch,
    module,
    setModule,
    actionType,
    setActionType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    tenantId,
    setTenantId,
    tenants,
    canFilterByOrg,
    logs: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    totalPages: list.totalPages,
    setPage: list.setPage,
    loading: list.loading,
    error: list.error,
  };
}
