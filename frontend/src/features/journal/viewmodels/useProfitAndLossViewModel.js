import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

function defaultMonthStart() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function useProfitAndLossViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultMonthStart);
  const [dateTo, setDateTo] = useState(todayISO);
  const [profitAndLoss, setProfitAndLoss] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    inventoryApi.getProfitAndLoss({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((result) => {
        if (!cancelled) setProfitAndLoss(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  return { dateFrom, setDateFrom, dateTo, setDateTo, profitAndLoss, loading, error };
}
