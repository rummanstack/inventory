import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function useSupplierStatementViewModel({ suppliers }) {
  const [searchParams] = useSearchParams();
  const today = todayISO();
  const [supplierId, setSupplierId] = useState(searchParams.get('supplierId') || '');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const hasAutoSelected = useRef(Boolean(supplierId));

  useEffect(() => {
    if (!hasAutoSelected.current && !supplierId && suppliers[0]) {
      hasAutoSelected.current = true;
      setSupplierId(suppliers[0].id);
    }
  }, [suppliers, supplierId]);

  const query = useTenantReportQuery({
    scope: 'supplier-due-statement',
    params: { supplierId, dateFrom, dateTo },
    queryFn: () => inventoryApi.getSupplierDueStatement({ supplierId, dateFrom, dateTo }),
    enabled: Boolean(supplierId),
    keepPrevious: true,
  });

  return {
    supplierId, setSupplierId, dateFrom, setDateFrom, dateTo, setDateTo,
    statement: query.data || null,
    loading: query.isPending,
    error: query.error?.message || '',
    refresh: query.refetch,
  };
}
