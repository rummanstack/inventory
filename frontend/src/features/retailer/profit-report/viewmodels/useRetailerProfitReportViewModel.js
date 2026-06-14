import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';
import { todayISO } from '../../../../utils/calculations.js';

function defaultDateFrom() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  local.setUTCDate(local.getUTCDate() - 29);
  return local.toISOString().slice(0, 10);
}

export function useRetailerProfitReportViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayISO);
  const [saleType, setSaleType] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    inventoryApi
      .getRetailerProfitReport({ dateFrom, dateTo, saleType: saleType || undefined })
      .then((result) => {
        if (!cancelled) setReport(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setReport(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, saleType]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    saleType,
    setSaleType,
    report,
    loading,
    error,
  };
}
