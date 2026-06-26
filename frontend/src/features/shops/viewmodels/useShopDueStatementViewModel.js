import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useRefetchOnVisible } from '../../../app/hooks/useRefetchOnVisible.js';

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
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const hasAutoSelected = useRef(Boolean(shopId));

  useEffect(() => {
    if (!hasAutoSelected.current && !shopId && shops[0]) {
      hasAutoSelected.current = true;
      setShopId(shops[0].id);
    }
  }, [shops, shopId]);

  useEffect(() => {
    let cancelled = false;

    if (!shopId) {
      setStatement(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    inventoryApi
      .getShopDueStatement({ shopId, dateFrom, dateTo })
      .then((result) => {
        if (!cancelled) setStatement(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setStatement(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [shopId, dateFrom, dateTo, version]);

  async function recordDue({ amount, note, businessDate }) {
    setActionError('');
    setActionLoading(true);
    try {
      await inventoryApi.recordShopDue({ shopId, amount, note, businessDate });
      setVersion((v) => v + 1);
      return { ok: true };
    } catch (err) {
      setActionError(err.message);
      return { ok: false, error: err.message };
    } finally {
      setActionLoading(false);
    }
  }

  async function collectDue({ amount, note, businessDate }) {
    setActionError('');
    setActionLoading(true);
    try {
      await inventoryApi.collectShopDue({ shopId, amount, note, businessDate });
      setVersion((v) => v + 1);
      return { ok: true };
    } catch (err) {
      setActionError(err.message);
      return { ok: false, error: err.message };
    } finally {
      setActionLoading(false);
    }
  }

  const refresh = () => setVersion((v) => v + 1);
  useRefetchOnVisible(refresh);

  return {
    shopId,
    setShopId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    statement,
    loading,
    error,
    actionError,
    actionLoading,
    refresh,
    recordDue,
    collectDue,
  };
}
