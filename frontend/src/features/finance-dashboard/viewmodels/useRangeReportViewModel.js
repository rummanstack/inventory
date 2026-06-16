import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

export function useRangeReportViewModel() {
  const today = todayISO();
  const firstOfMonth = today.slice(0, 7) + '-01';
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchRange(from, to) {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.getFinanceDashboardRange({ dateFrom: from, dateTo: to });
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRange(firstOfMonth, today);
  }, []);

  function applyRange() {
    fetchRange(dateFrom, dateTo);
  }

  return { dateFrom, setDateFrom, dateTo, setDateTo, data, loading, error, applyRange };
}
