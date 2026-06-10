import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagination } from '../../../hooks/usePagination';

const SEARCH_DEBOUNCE_MS = 300;

export function useProductsViewModel() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listProducts({ page, pageSize, search: debouncedSearch });
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

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, version]);

  return {
    search,
    setSearch,
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
