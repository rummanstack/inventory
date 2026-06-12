import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';

const SEARCH_DEBOUNCE_MS = 300;

export function useProductsViewModel() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listProducts({ page, pageSize, search: debouncedSearch }),
    [debouncedSearch],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      list.resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return { search, setSearch, ...list };
}
