import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';

// The backend returns a plain array (no pagination) — deliberately not built
// on usePagedList, which assumes a {items,total,totalPages} response shape.
export function useLateFeeRulesViewModel() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await inventoryApi.listInstallmentLateFeeRules();
      setRules(result || []);
    } catch (requestError) {
      setError(requestError.message);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rules, loading, error, reload: load };
}
