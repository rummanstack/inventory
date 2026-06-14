import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { buildHistoryRows } from '../../../models/inventoryViewData.js';

const SEARCH_DEBOUNCE_MS = 300;

const LOADERS = {
  issues: (params) => inventoryApi.listIssues(params),
  settlements: (params) => inventoryApi.listSettlements(params),
};

export function useHistoryViewModel(type) {
  const loadPage = LOADERS[type];
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const list = usePagedList(
    ({ page, pageSize }) => loadPage({ page, pageSize, search: debouncedSearch }),
    [debouncedSearch],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, list.resetPage]);

  const rows = type === 'issues'
    ? buildHistoryRows({ issues: list.items, settlements: [] })
    : buildHistoryRows({ issues: [], settlements: list.items });

  return {
    search,
    setSearch,
    rows,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    totalPages: list.totalPages,
    setPage: list.setPage,
    loading: list.loading,
    error: list.error,
  };
}
