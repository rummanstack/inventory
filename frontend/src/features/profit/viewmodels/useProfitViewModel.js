import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

function defaultDateFrom() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  local.setUTCDate(local.getUTCDate() - 29);
  return local.toISOString().slice(0, 10);
}

const BREAKDOWN_LOADERS = {
  dsr: (params) => inventoryApi.getDsrProfitReport(params),
  product: (params) => inventoryApi.getProductProfitReport(params),
  customer: (params) => inventoryApi.getCustomerProfitReport(params),
  category: (params) => inventoryApi.getCategoryProfitReport(params),
};

export function useProfitViewModel() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayISO);
  const [view, setView] = useState('daily');
  const [tab, setTab] = useState('overview');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [breakdowns, setBreakdowns] = useState({});
  const [loadedKeys, setLoadedKeys] = useState({});
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

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

  // Each non-overview tab is fetched only once it's activated, and re-fetched only when
  // the date range actually changes while it's active — avoids firing all 4 breakdown
  // requests up front on every page load.
  useEffect(() => {
    const loadBreakdown = BREAKDOWN_LOADERS[tab];
    if (!loadBreakdown) return;

    const key = `${dateFrom}:${dateTo}`;
    if (loadedKeys[tab] === key) return;

    let cancelled = false;
    setBreakdownLoading(true);
    setBreakdownError('');
    loadBreakdown({ dateFrom, dateTo })
      .then((result) => {
        if (cancelled) return;
        setBreakdowns((current) => ({ ...current, [tab]: result }));
        setLoadedKeys((current) => ({ ...current, [tab]: key }));
      })
      .catch((requestError) => {
        if (!cancelled) setBreakdownError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setBreakdownLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, dateFrom, dateTo]);

  return {
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    view,
    setView,
    tab,
    setTab,
    report,
    loading,
    error,
    breakdowns,
    breakdownLoading,
    breakdownError,
  };
}
