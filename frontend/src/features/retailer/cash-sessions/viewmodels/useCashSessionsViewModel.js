import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';
import { usePolling } from '../../../../hooks/usePolling.js';

const OPEN_SESSION_POLL_MS = 30_000;

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

  const hasOpenSession = list.items.some((s) => s.isOpen);
  usePolling(list.reload, OPEN_SESSION_POLL_MS, { enabled: hasOpenSession });

  return {
    ...list,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}
