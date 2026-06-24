import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';

export function useCashSessionsViewModel() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listRetailCashSessions({
      page,
      pageSize,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo],
  );

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  return {
    ...list,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}
