import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useQuotationsViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listQuotations({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [debouncedSearch, status, dateFrom, dateTo],
    'quotations',
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, status, dateFrom, dateTo, list.resetPage]);

  return {
    search,
    setSearch,
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ...list,
  };
}
