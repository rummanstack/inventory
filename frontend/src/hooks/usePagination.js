import { useCallback, useState } from 'react';

const DEFAULT_PAGE_SIZE = 20;

export function usePagination({ pageSize: initialPageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const resetPage = useCallback(() => setPage(1), []);

  return { page, setPage, pageSize, setPageSize, resetPage };
}
