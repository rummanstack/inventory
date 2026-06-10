import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagination } from '../../../hooks/usePagination';
import { buildHistoryRows } from '../../../models/inventoryViewData.js';

const SEARCH_DEBOUNCE_MS = 300;

const LOADERS = {
  issues: (params) => inventoryApi.listIssues(params),
  settlements: (params) => inventoryApi.listSettlements(params),
};

export function useHistoryViewModel(type) {
  const loadPage = LOADERS[type];
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { page, setPage, pageSize, resetPage } = usePagination();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [search, resetPage]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const result = await loadPage({ page, pageSize, search: debouncedSearch });
        if (!cancelled) {
          setItems(result.items || []);
          setTotal(result.total || 0);
          setTotalPages(result.totalPages || 0);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setItems([]);
          setTotal(0);
          setTotalPages(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [loadPage, page, pageSize, debouncedSearch]);

  const rows = type === 'issues'
    ? buildHistoryRows({ issues: items, settlements: [] })
    : buildHistoryRows({ issues: [], settlements: items });

  return {
    search,
    setSearch,
    rows,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    loading,
    error,
  };
}
