import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { usePagedList } from '../../../../hooks/usePagedList.js';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue.js';

export function useDesignationsViewModel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const list = usePagedList(
    ({ page, pageSize }) =>
      inventoryApi.listDesignations({ page, pageSize, search: debouncedSearch, status: status || undefined }),
    [debouncedSearch, status],
  );

  return { search, setSearch, status, setStatus, ...list };
}
