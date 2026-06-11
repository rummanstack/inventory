import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagination } from '../../../hooks/usePagination';

const SEARCH_DEBOUNCE_MS = 300;

export function useCustomersViewModel() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const { page, setPage, pageSize, resetPage } = usePagination();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [search, resetPage]);

  useEffect(() => {
    resetPage();
  }, [status, resetPage]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listCustomers({ page, pageSize, search: debouncedSearch, status: status || undefined });
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

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, status, version]);

  return {
    search,
    setSearch,
    status,
    setStatus,
    items,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    loading,
    error,
    reload: () => setVersion((v) => v + 1),
  };
}
