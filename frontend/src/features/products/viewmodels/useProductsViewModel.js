import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePagination } from '../../../hooks/usePagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { fetchProductList, productKeys } from '../queries/productQueries.js';

const SEARCH_DEBOUNCE_MS = 300;

export function useProductsViewModel({ tenantId } = {}) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const { page, setPage, pageSize, resetPage } = usePagination();
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const filters = useMemo(() => ({
    page,
    pageSize,
    search: debouncedSearch,
    categoryId: categoryId || undefined,
  }), [page, pageSize, debouncedSearch, categoryId]);
  const productsQuery = useQuery({
    queryKey: productKeys.list(tenantId || '', filters),
    queryFn: () => fetchProductList(filters),
    enabled: Boolean(tenantId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, categoryId, resetPage]);

  const result = productsQuery.data || {};
  return {
    search,
    setSearch,
    categoryId,
    setCategoryId,
    items: result.items || [],
    total: result.total || 0,
    totalPages: result.totalPages || 0,
    page,
    pageSize,
    setPage,
    resetPage,
    loading: productsQuery.isPending,
    error: productsQuery.error?.message || '',
    reload: productsQuery.refetch,
  };
}
