import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';

export function useInstallmentPlansViewModel() {
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listInstallmentPlans({
      page,
      pageSize,
      status: status || undefined,
      customerId: customerId || undefined,
    }),
    [status, customerId],
  );

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, customerId]);

  return {
    status,
    setStatus,
    customerId,
    setCustomerId,
    ...list,
  };
}
