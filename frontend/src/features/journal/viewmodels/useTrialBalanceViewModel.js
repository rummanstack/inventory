import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

export function useTrialBalanceViewModel() {
  const [asOfDate, setAsOfDate] = useState(todayISO);
  const [trialBalance, setTrialBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    inventoryApi.getTrialBalance({ dateTo: asOfDate })
      .then((result) => {
        if (!cancelled) setTrialBalance(result);
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
  }, [asOfDate]);

  return { asOfDate, setAsOfDate, trialBalance, loading, error };
}
