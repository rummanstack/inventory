import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';

const SEARCH_DEBOUNCE_MS = 300;
const TODAY_ACTIVITY_PAGE_SIZE = 100;

export function useDsrViewModel({ today }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [inProgressDsrIds, setInProgressDsrIds] = useState(new Set());

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listDsrs({ page, pageSize, search: debouncedSearch }),
    [debouncedSearch],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      list.resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function loadTodayActivity() {
      try {
        const [issuesResult, settlementsResult] = await Promise.all([
          inventoryApi.listIssues({ dateFrom: today, dateTo: today, pageSize: TODAY_ACTIVITY_PAGE_SIZE }),
          inventoryApi.listSettlements({ dateFrom: today, dateTo: today, pageSize: TODAY_ACTIVITY_PAGE_SIZE }),
        ]);

        if (cancelled) {
          return;
        }

        const settledDsrIds = new Set((settlementsResult.items || []).map((settlement) => settlement.dsrId));
        const ids = new Set(
          (issuesResult.items || [])
            .filter((issue) => !settledDsrIds.has(issue.dsrId))
            .map((issue) => issue.dsrId),
        );
        setInProgressDsrIds(ids);
      } catch {
        if (!cancelled) {
          setInProgressDsrIds(new Set());
        }
      }
    }

    if (today) {
      loadTodayActivity();
    }

    return () => {
      cancelled = true;
    };
  }, [today]);

  return {
    search,
    setSearch,
    inProgressDsrIds,
    ...list,
  };
}
