import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { useRefetchOnVisible } from '../../../app/hooks/useRefetchOnVisible.js';

export function useFinanceDashboardViewModel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.getFinanceDashboard();
      setData(result);
    } catch (requestError) {
      setError(requestError.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRefetchOnVisible(load);

  return { data, loading, error, refresh: load };
}
