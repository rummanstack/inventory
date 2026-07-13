import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

export function useCollectionReportViewModel() {
  const today = todayISO();
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchRange(from, to) {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.getInstallmentCollectionReport({ dateFrom: from, dateTo: to });
      setData(result);
    } catch (requestError) {
      setError(requestError.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRange(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRange() {
    fetchRange(dateFrom, dateTo);
  }

  return { dateFrom, setDateFrom, dateTo, setDateTo, data, loading, error, applyRange };
}
