import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagination } from '../../../hooks/usePagination';

const SEARCH_DEBOUNCE_MS = 300;
const TODAY_ACTIVITY_PAGE_SIZE = 100;

export function useDsrViewModel({ today }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { page, setPage, pageSize, resetPage } = usePagination();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inProgressDsrIds, setInProgressDsrIds] = useState(new Set());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
      resetPage();
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [search, resetPage]);

  useEffect(() => {
    let cancelled = false;

    async function loadDsrs() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listDsrs({ page, pageSize, search: debouncedSearch });
        if (!cancelled) {
          setItems(result.items || []);
          setTotal(result.total || 0);
          setTotalPages(result.totalPages || 0);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setItems([]);
          setTotal(0);
          setTotalPages(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDsrs();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, version]);

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
    items,
    total,
    page,
    pageSize,
    totalPages,
    setPage,
    loading,
    error,
    inProgressDsrIds,
    reload: () => setVersion((v) => v + 1),
  };
}
