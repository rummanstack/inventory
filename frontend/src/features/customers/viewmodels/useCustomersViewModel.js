import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useCustomersViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [status, setStatus] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listCustomers({ page, pageSize, search: debouncedSearch, status: status || undefined }),
    [debouncedSearch, status],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, status, list.resetPage]);

  return { search, setSearch, status, setStatus, ...list };
}
