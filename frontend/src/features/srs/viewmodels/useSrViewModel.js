import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useSrViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listSrs({ page, pageSize, search: debouncedSearch }),
    [debouncedSearch],
  );

  return {
    search,
    setSearch,
    ...list,
  };
}
