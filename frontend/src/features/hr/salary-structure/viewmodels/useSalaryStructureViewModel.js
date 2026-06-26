import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';

export function useSalaryStructureViewModel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await inventoryApi.listSalaryStructures();
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}
