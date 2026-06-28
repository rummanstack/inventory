import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

function defaultDateFrom() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  local.setUTCDate(local.getUTCDate() - 29);
  return local.toISOString().slice(0, 10);
}

export function useSalesReturnReportViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayISO);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    inventoryApi
      .getSalesReturnReport({ dateFrom, dateTo })
      .then((result) => { if (!cancelled) setReport(result); })
      .catch((err) => { if (!cancelled) { setError(err.message); setReport(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  return { dateFrom, setDateFrom, dateTo, setDateTo, report, loading, error };
}
