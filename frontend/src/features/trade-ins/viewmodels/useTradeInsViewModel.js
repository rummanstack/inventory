import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useTradeInsViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listTradeIns({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [debouncedSearch, dateFrom, dateTo],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, dateFrom, dateTo, list.resetPage]);

  return {
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ...list,
  };
}
