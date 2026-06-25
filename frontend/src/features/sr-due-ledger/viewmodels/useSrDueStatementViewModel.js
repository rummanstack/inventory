import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

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
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const hasAutoSelected = useRef(Boolean(srId));

  useEffect(() => {
    if (!hasAutoSelected.current && !srId && srs[0]) {
      hasAutoSelected.current = true;
      setSrId(srs[0].id);
    }
  }, [srs, srId]);

  useEffect(() => {
    let cancelled = false;

    if (!srId) {
      setStatement(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    inventoryApi
      .getSrDueLedgerStatement({ srId, dateFrom, dateTo })
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
  }, [srId, dateFrom, dateTo, version]);

  async function collectDue({ amount, note, businessDate, financeAccountId }) {
    setActionLoading(true);
    try {
      await inventoryApi.collectSrDue({ srId, amount, note, businessDate, financeAccountId });
      setVersion((v) => v + 1);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    } finally {
      setActionLoading(false);
    }
  }

  return {
    srId,
    setSrId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    statement,
    loading,
    error,
    actionLoading,
    refresh: () => setVersion((v) => v + 1),
    collectDue,
  };
}
