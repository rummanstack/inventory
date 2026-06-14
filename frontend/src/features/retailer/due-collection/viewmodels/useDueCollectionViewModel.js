import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';

export function useDueCollectionViewModel() {
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listCustomerPayments({
      page,
      pageSize,
      customerId: customerId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [customerId, dateFrom, dateTo],
  );

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, dateFrom, dateTo]);

  return {
    customerId,
    setCustomerId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ...list,
  };
}
