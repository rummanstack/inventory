import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';

export function useSupplierPaymentsViewModel() {
  const [supplierId, setSupplierId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listSupplierPayments({
      page,
      pageSize,
      supplierId: supplierId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [supplierId, dateFrom, dateTo],
    'supplier-payments',
  );

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, dateFrom, dateTo]);

  return {
    supplierId,
    setSupplierId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ...list,
  };
}
