import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

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
  const [statement, setStatement] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!dsrId && dsrs[0]) {
      setDsrId(dsrs[0].id);
    }
  }, [dsrs, dsrId]);

  useEffect(() => {
    let cancelled = false;

    if (!dsrId) {
      setStatement(null);
      setCurrentBalance(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    Promise.all([
      inventoryApi.getDsrDueStatement({ dsrId, dateFrom, dateTo }),
      inventoryApi.getDsrDueBalance(dsrId),
    ])
      .then(([statementResult, balanceResult]) => {
        if (!cancelled) {
          setStatement(statementResult);
          setCurrentBalance(balanceResult?.balance ?? null);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setStatement(null);
          setCurrentBalance(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dsrId, dateFrom, dateTo, version]);

  async function settleDue({ amount, note }) {
    try {
      await inventoryApi.settleDsrDue({ dsrId, amount, note });
      setVersion((value) => value + 1);
      return { ok: true };
    } catch (requestError) {
      return { ok: false, message: requestError.message };
    }
  }

  return {
    dsrId,
    setDsrId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    statement,
    currentBalance,
    loading,
    error,
    refresh: () => setVersion((value) => value + 1),
    settleDue,
  };
}
