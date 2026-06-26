import { useEffect, useRef, useState } from 'react';
import { usePagination } from './usePagination';

export function usePagedList(fetcher, deps = []) {
  const { page, setPage, pageSize, resetPage } = usePagination();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const versionRef = useRef(null);
  versionRef.current = () => setVersion((v) => v + 1);
  useEffect(() => {
    let last = 0;
    function trigger() {
      const now = Date.now();
      if (now - last > 1000) { last = now; versionRef.current(); }
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') trigger();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', trigger);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', trigger);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const result = await fetcher({ page, pageSize });
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

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, version, ...deps]);

  return { items, total, page, pageSize, totalPages, setPage, resetPage, loading, error, reload: () => setVersion((v) => v + 1) };
}
