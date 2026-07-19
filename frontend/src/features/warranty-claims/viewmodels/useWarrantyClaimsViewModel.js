import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useWarrantyClaimsViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function resetFilters() {
    setSearch('');
    setStatus('');
    setSupplierId('');
    setProductId('');
    setDateFrom('');
    setDateTo('');
  }

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listWarrantyClaims({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      status: status || undefined,
      supplierId: supplierId || undefined,
      productId: productId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [debouncedSearch, status, supplierId, productId, dateFrom, dateTo],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, status, supplierId, productId, dateFrom, dateTo, list.resetPage]);

  return {
    search,
    setSearch,
    status,
    setStatus,
    supplierId,
    setSupplierId,
    productId,
    setProductId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resetFilters,
    ...list,
  };
}
