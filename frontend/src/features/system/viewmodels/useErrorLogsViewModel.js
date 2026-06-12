import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';

export function useErrorLogsViewModel() {
  const list = usePagedList(({ page, pageSize }) => inventoryApi.listErrorLogs({ page, pageSize }));

  return {
    logs: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    totalPages: list.totalPages,
    setPage: list.setPage,
    loading: list.loading,
    error: list.error,
  };
}
