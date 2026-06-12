import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

const SEARCH_DEBOUNCE_MS = 300;
const PLATFORM_ROLES = new Set(['platform_admin', 'system_developer']);

export function useActivityLogsViewModel() {
  const { user } = useInventoryApp();
  const canFilterByOrg = PLATFORM_ROLES.has(user?.role);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [module, setModule] = useState('');
  const [actionType, setActionType] = useState('');
  const [debouncedActionType, setDebouncedActionType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState([]);

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
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setDebouncedActionType(actionType.trim());
      list.resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, actionType]);

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, dateFrom, dateTo, tenantId]);

  useEffect(() => {
    if (!canFilterByOrg) {
      return;
    }

    inventoryApi
      .listTenants()
      .then((result) => setTenants(result.tenants || result.items || []))
      .catch(() => setTenants([]));
  }, [canFilterByOrg]);

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
