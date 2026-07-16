import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePagination } from './usePagination';
import { getActiveTenantId } from '../services/api/client.js';
import { apiListKeys } from '../queries/apiQueryKeys.js';

export function usePagedList(fetcher, deps = [], queryScope) {
  const { page, setPage, pageSize, resetPage } = usePagination();
  const tenantScope = getActiveTenantId() || 'session-tenant';
  const fallbackScope = useMemo(() => fetcher.toString(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const query = useQuery({
    queryKey: apiListKeys.list({
      tenantId: tenantScope,
      scope: queryScope || fallbackScope,
      page,
      pageSize,
      dependencies: deps,
    }),
    queryFn: () => fetcher({ page, pageSize }),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const result = query.data || {};

  return {
    items: result.items || [],
    total: result.total || 0,
    page,
    pageSize,
    totalPages: result.totalPages || 0,
    setPage,
    resetPage,
    loading: query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  };
}
