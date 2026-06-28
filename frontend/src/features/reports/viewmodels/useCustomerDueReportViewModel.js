import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';

export function useCustomerDueReportViewModel() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    inventoryApi
      .getCustomerDueReport()
      .then((result) => { if (!cancelled) setReport(result); })
      .catch((err) => { if (!cancelled) { setError(err.message); setReport(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { report, loading, error };
}
