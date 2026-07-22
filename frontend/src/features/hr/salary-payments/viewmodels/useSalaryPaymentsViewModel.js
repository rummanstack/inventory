import { useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';

function currentMonth() {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

export function useSalaryPaymentsViewModel() {
  const [month, setMonth] = useState(currentMonth);
  const setAllowedMonth = (nextMonth) => {
    if (nextMonth && nextMonth <= currentMonth()) setMonth(nextMonth);
  };
  const query = useTenantApiQuery({
    scope: 'salary-overview',
    params: { month },
    queryFn: () => inventoryApi.getSalaryOverview(month),
    keepPrevious: true,
  });
  return {
    month,
    setMonth: setAllowedMonth,
    data: query.data || null,
    loading: query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  };
}
