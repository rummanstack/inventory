import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;
const TODAY_ACTIVITY_PAGE_SIZE = 100;

export function useDsrViewModel({ today }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [inProgressDsrIds, setInProgressDsrIds] = useState(new Set());

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listDsrs({ page, pageSize, search: debouncedSearch }),
    [debouncedSearch],
  );

  useEffect(() => {
    list.resetPage();
  }, [debouncedSearch, list.resetPage]);

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
