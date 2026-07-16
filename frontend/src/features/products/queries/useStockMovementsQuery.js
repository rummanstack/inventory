import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { fetchStockMovements, productKeys } from './productQueries.js';

export function useStockMovementsQuery(filters, { refreshKey = 0 } = {}) {
  const { tenant, user } = useInventoryApp();
  const tenantId = tenant?.id || user?.tenantId || '';
  const queryFilters = { ...filters, refreshKey };

  return useQuery({
    queryKey: productKeys.stockMovements(tenantId, queryFilters),
    queryFn: () => fetchStockMovements(filters),
    enabled: Boolean(tenantId),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
