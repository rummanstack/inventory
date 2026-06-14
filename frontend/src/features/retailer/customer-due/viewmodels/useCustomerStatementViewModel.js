import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../../../../services/inventoryApi';
import { todayISO } from '../../../../utils/calculations.js';

function subtractDays(dateISO, days) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function useCustomerStatementViewModel({ customers }) {
  const [searchParams] = useSearchParams();
  const today = todayISO();
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') || '');
  const [dateFrom, setDateFrom] = useState(subtractDays(today, 29));
  const [dateTo, setDateTo] = useState(today);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const hasAutoSelected = useRef(Boolean(customerId));

  useEffect(() => {
    if (!hasAutoSelected.current && !customerId && customers[0]) {
      hasAutoSelected.current = true;
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId]);

  useEffect(() => {
    let cancelled = false;

    if (!customerId) {
      setStatement(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    inventoryApi
      .getCustomerDueStatement({ customerId, dateFrom, dateTo })
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
  }, [customerId, dateFrom, dateTo, version]);

  return {
    customerId,
    setCustomerId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    statement,
    loading,
    error,
    refresh: () => setVersion((value) => value + 1),
  };
}
