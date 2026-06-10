import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagination } from '../../../hooks/usePagination';

const SEARCH_DEBOUNCE_MS = 300;

export function useActivityLogsViewModel() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { page, setPage, pageSize, resetPage } = usePagination();
  const [logs, setLogs] = useState([]);
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

    async function loadLogs() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listActivityLogs({ page, pageSize, search: debouncedSearch });
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
  }, [page, pageSize, debouncedSearch]);

  return {
    search,
    setSearch,
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
