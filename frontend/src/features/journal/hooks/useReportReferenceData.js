import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi.js';

export function useReportReferenceData() {
  const [data, setData] = useState({ accounts: [], fiscalYears: [], customers: [], suppliers: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await inventoryApi.getReportReferenceData();
        if (!cancelled) {
          setData({
            accounts: result.accounts || [],
            fiscalYears: result.fiscalYears || [],
            customers: result.customers || [],
            suppliers: result.suppliers || [],
            settings: result.settings || null,
          });
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Failed to load report reference data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const periods = useMemo(() => data.fiscalYears.flatMap((year) => year.periods || []), [data.fiscalYears]);
  return { ...data, periods, loading, error };
}
