import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { getActiveTenantId } from '../../../services/api/client.js';

const SEARCH_DEBOUNCE_MS = 300;
const TODAY_ACTIVITY_PAGE_SIZE = 100;

export function useDsrViewModel({ today }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listDsrs({ page, pageSize, search: debouncedSearch }),
    [debouncedSearch],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, list.resetPage]);

  const todayActivityQuery = useQuery({
    queryKey: ['api-data', getActiveTenantId() || 'session-tenant', 'dsr-today-activity', today],
    enabled: Boolean(today),
    staleTime: 0,
    queryFn: async () => {
      const [issuesResult, settlementsResult] = await Promise.all([
        inventoryApi.listIssues({ dateFrom: today, dateTo: today, pageSize: TODAY_ACTIVITY_PAGE_SIZE }),
        inventoryApi.listSettlements({ dateFrom: today, dateTo: today, pageSize: TODAY_ACTIVITY_PAGE_SIZE }),
      ]);
      const settledDsrIds = new Set((settlementsResult.items || []).map((settlement) => settlement.dsrId));
      return new Set(
        (issuesResult.items || [])
          .filter((issue) => !settledDsrIds.has(issue.dsrId))
          .map((issue) => issue.dsrId),
      );
    },
  });
  const inProgressDsrIds = todayActivityQuery.data || new Set();

  return {
    search,
    setSearch,
    inProgressDsrIds,
    ...list,
  };
}
