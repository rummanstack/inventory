import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useProductSerialsViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [productId, setProductId] = useState('');
  const [status, setStatus] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listProductSerials({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      productId: productId || undefined,
      status: status || undefined,
    }),
    [debouncedSearch, productId, status],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, productId, status, list.resetPage]);

  return { search, setSearch, productId, setProductId, status, setStatus, ...list };
}
