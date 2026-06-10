import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

export function useMonthEndSummaryViewModel() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.getMonthEndSummary({ month });
        if (!cancelled) {
          setReport(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setReport(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [month]);

  return {
    month,
    setMonth,
    report,
    loading,
    error,
  };
}
