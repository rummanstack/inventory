import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { usePagedList } from '../../../../hooks/usePagedList';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

export function useEmployeesViewModel() {
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const list = usePagedList(
    ({ page, pageSize }) =>
      inventoryApi.listEmployees({
        page,
        pageSize,
        search: debouncedSearch,
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
      }),
    [debouncedSearch, departmentId, designationId],
  );

  return {
    search,
    setSearch,
    departmentId,
    setDepartmentId,
    designationId,
    setDesignationId,
    ...list,
  };
}
