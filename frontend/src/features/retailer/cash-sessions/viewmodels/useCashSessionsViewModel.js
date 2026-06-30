import { useEffect, useRef, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';

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

  // Keep a stable ref so the interval always calls the latest reload
  const reloadRef = useRef(list.reload);
  reloadRef.current = list.reload;

  const hasOpenSession = list.items.some((s) => s.isOpen);

  useEffect(() => {
    if (!hasOpenSession) return;
    const id = setInterval(() => reloadRef.current(), OPEN_SESSION_POLL_MS);
    return () => clearInterval(id);
  }, [hasOpenSession]);

  return {
    ...list,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}
