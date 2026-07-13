import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';

export function useInstallmentPlanDetailViewModel(planId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!planId) return;
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.getInstallmentPlan(planId);
      setData(result);
    } catch (requestError) {
      setError(requestError.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
