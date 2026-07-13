import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

function addDaysIso(dateISO, days) {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function useDueScheduleReportViewModel() {
  const today = todayISO();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(addDaysIso(today, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchRange(from, to) {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.getInstallmentDueScheduleReport({ dateFrom: from, dateTo: to });
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
