import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function useSalaryPaymentsViewModel() {
  const [month, setMonth] = useState(currentMonth);
  const query = useTenantApiQuery({
    scope: 'salary-overview',
    params: { month },
    queryFn: () => inventoryApi.getSalaryOverview(month),
    keepPrevious: true,
  });
  return {
    month,
    setMonth,
    data: query.data || null,
    loading: query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  };
}
