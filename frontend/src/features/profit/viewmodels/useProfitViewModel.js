import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

function defaultDateFrom() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  local.setUTCDate(local.getUTCDate() - 29);
  return local.toISOString().slice(0, 10);
}

export function useProfitViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayISO);
  const [view, setView] = useState('daily');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReport() {
    try {
      setLoading(true);
      setError('');
      const nextReport = await inventoryApi.getProfitReport({ dateFrom, dateTo });
      setReport(nextReport);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [dateFrom, dateTo]);

  return {
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    view,
    setView,
    report,
    loading,
    error,
  };
}
