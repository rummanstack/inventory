import { useEffect, useState } from 'react';
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

export function useDsrDueStatementViewModel({ dsrs }) {
  const today = todayISO();
  const [dsrId, setDsrId] = useState('');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    if (!dsrId && dsrs[0]) setDsrId(dsrs[0].id);
  }, [dsrs, dsrId]);

  const query = useTenantReportQuery({
    scope: 'dsr-due-statement',
    params: { dsrId, dateFrom, dateTo },
    queryFn: async () => {
      const [statement, balance] = await Promise.all([
        inventoryApi.getDsrDueStatement({ dsrId, dateFrom, dateTo }),
        inventoryApi.getDsrDueBalance(dsrId),
      ]);
      return { statement, currentBalance: balance?.balance ?? null };
    },
    enabled: Boolean(dsrId),
    keepPrevious: true,
  });
  const settleMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'settle-dsr-due'),
    mutationFn: (payload) => inventoryApi.settleDsrDue(payload),
  });

  async function settleDue({ amount, note }) {
    try {
      await settleMutation.mutateAsync({ dsrId, amount, note });
      await query.refetch();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  return {
    dsrId, setDsrId, dateFrom, setDateFrom, dateTo, setDateTo,
    statement: query.data?.statement || null,
    currentBalance: query.data?.currentBalance ?? null,
    loading: query.isPending,
    error: query.error?.message || '',
    refresh: query.refetch,
    settleDue,
  };
}
