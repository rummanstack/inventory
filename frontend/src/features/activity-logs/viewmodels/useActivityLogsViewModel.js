import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagination } from '../../../hooks/usePagination';
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
  const { page, setPage, pageSize, resetPage } = usePagination();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setDebouncedActionType(actionType.trim());
      resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [search, actionType, resetPage]);

  useEffect(() => {
    resetPage();
  }, [module, dateFrom, dateTo, tenantId, resetPage]);

  useEffect(() => {
    if (!canFilterByOrg) {
      return;
    }

    inventoryApi
      .listTenants()
      .then((result) => setTenants(result.tenants || result.items || []))
      .catch(() => setTenants([]));
  }, [canFilterByOrg]);

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listActivityLogs({
          page,
          pageSize,
          search: debouncedSearch,
          module: module || undefined,
          actionType: debouncedActionType || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          tenantId: canFilterByOrg ? tenantId || undefined : undefined,
        });
        if (!cancelled) {
          setLogs(result.items || []);
          setTotal(result.total || 0);
          setTotalPages(result.totalPages || 0);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setLogs([]);
          setTotal(0);
          setTotalPages(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, module, debouncedActionType, dateFrom, dateTo, tenantId, canFilterByOrg]);

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
    logs,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    loading,
    error,
  };
}
