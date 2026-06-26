import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';

export function usePayrollViewModel() {
  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listPayrolls({ page, pageSize }),
    [],
  );
  return { ...list };
}
