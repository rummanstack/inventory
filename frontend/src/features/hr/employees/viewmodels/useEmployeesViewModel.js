import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

export function useEmployeesViewModel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const list = usePagedList(
    ({ page, pageSize }) =>
      inventoryApi.listEmployees({ page, pageSize, search: debouncedSearch, status: status || undefined }),
    [debouncedSearch, status],
  );

  return { search, setSearch, status, setStatus, ...list };
}
