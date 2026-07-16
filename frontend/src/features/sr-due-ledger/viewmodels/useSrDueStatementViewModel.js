import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';
import { getActiveTenantId } from '../../../services/api/client.js';

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function useSrDueStatementViewModel({ srs }) {
  const [searchParams] = useSearchParams();
  const today = todayISO();
  const [srId, setSrId] = useState(searchParams.get('srId') || '');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const hasAutoSelected = useRef(Boolean(srId));

  useEffect(() => {
    if (!hasAutoSelected.current && !srId && srs[0]) {
      hasAutoSelected.current = true;
      setSrId(srs[0].id);
    }
  }, [srs, srId]);

  const query = useTenantReportQuery({
    scope: 'sr-due-statement',
    params: { srId, dateFrom, dateTo },
    queryFn: () => inventoryApi.getSrDueLedgerStatement({ srId, dateFrom, dateTo }),
    enabled: Boolean(srId),
    keepPrevious: true,
  });
  const collectMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'collect-sr-due'),
    mutationFn: (payload) => inventoryApi.collectSrDue(payload),
  });

  async function collectDue(values) {
    try {
      await collectMutation.mutateAsync({ srId, ...values });
      await query.refetch();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  return {
    srId, setSrId, dateFrom, setDateFrom, dateTo, setDateTo,
    statement: query.data || null,
    loading: query.isPending,
    error: query.error?.message || '',
    actionLoading: collectMutation.isPending,
    refresh: query.refetch,
    collectDue,
  };
}
