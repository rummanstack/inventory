import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useProductsViewModel() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listProducts({ page, pageSize, search: debouncedSearch, categoryId: categoryId || undefined }),
    [debouncedSearch, categoryId],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, categoryId, list.resetPage]);

  return { search, setSearch, categoryId, setCategoryId, ...list };
}
