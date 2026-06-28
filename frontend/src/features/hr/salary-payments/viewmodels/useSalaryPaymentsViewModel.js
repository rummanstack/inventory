import { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi.js';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function useSalaryPaymentsViewModel() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await inventoryApi.getSalaryOverview(month);
      setData(result);
    } catch (err) {
      setError(err?.message || 'Failed to load salary data.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  return { month, setMonth, data, loading, error, reload: load };
}
