import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useRepairJobsViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [status, setStatus] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listRepairJobs({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      status: status || undefined,
      technicianId: technicianId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [debouncedSearch, status, technicianId, dateFrom, dateTo],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, status, technicianId, dateFrom, dateTo, list.resetPage]);

  function resetFilters() {
    setSearch('');
    setStatus('');
    setTechnicianId('');
    setDateFrom('');
    setDateTo('');
  }

  return {
    search,
    setSearch,
    status,
    setStatus,
    technicianId,
    setTechnicianId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resetFilters,
    ...list,
  };
}
