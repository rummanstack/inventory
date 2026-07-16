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

export function useShopDueStatementViewModel({ shops }) {
  const [searchParams] = useSearchParams();
  const today = todayISO();
  const [shopId, setShopId] = useState(searchParams.get('shopId') || '');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const [actionError, setActionError] = useState('');
  const hasAutoSelected = useRef(Boolean(shopId));

  useEffect(() => {
    if (!hasAutoSelected.current && !shopId && shops[0]) {
      hasAutoSelected.current = true;
      setShopId(shops[0].id);
    }
  }, [shops, shopId]);

  const query = useTenantReportQuery({
    scope: 'shop-due-statement',
    params: { shopId, dateFrom, dateTo },
    queryFn: () => inventoryApi.getShopDueStatement({ shopId, dateFrom, dateTo }),
    enabled: Boolean(shopId),
    keepPrevious: true,
  });
  const actionMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'shop-due-action'),
    mutationFn: ({ action, payload }) => action === 'record'
      ? inventoryApi.recordShopDue(payload)
      : inventoryApi.collectShopDue(payload),
  });

  async function runAction(action, values) {
    setActionError('');
    try {
      await actionMutation.mutateAsync({ action, payload: { shopId, ...values } });
      await query.refetch();
      return { ok: true };
    } catch (err) {
      setActionError(err.message);
      return { ok: false, error: err.message };
    }
  }

  return {
    shopId, setShopId, dateFrom, setDateFrom, dateTo, setDateTo,
    statement: query.data || null,
    loading: query.isPending,
    error: query.error?.message || '',
    actionError,
    actionLoading: actionMutation.isPending,
    refresh: query.refetch,
    recordDue: (values) => runAction('record', values),
    collectDue: (values) => runAction('collect', values),
  };
}
