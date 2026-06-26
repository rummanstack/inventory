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

export function useSupplierStatementViewModel({ suppliers }) {
  const [searchParams] = useSearchParams();
  const today = todayISO();
  const [supplierId, setSupplierId] = useState(searchParams.get('supplierId') || '');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const hasAutoSelected = useRef(Boolean(supplierId));

  useEffect(() => {
    if (!hasAutoSelected.current && !supplierId && suppliers[0]) {
      hasAutoSelected.current = true;
      setSupplierId(suppliers[0].id);
    }
  }, [suppliers, supplierId]);

  useEffect(() => {
    let cancelled = false;

    if (!supplierId) {
      setStatement(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    inventoryApi
      .getSupplierDueStatement({ supplierId, dateFrom, dateTo })
      .then((result) => {
        if (!cancelled) {
          setStatement(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setStatement(null);
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
  }, [supplierId, dateFrom, dateTo, version]);

  const refresh = () => setVersion((value) => value + 1);
  useRefetchOnVisible(refresh);

  return {
    supplierId,
    setSupplierId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    statement,
    loading,
    error,
    refresh,
  };
}
