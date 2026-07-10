import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useTradePromotionEarningsViewModel() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listTradePromotionEarnings({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, supplierId, productId, dateFrom, dateTo]);

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
    ...list,
  };
}
