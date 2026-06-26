import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/inventoryApi';

export function useSalaryReportsViewModel() {
  const [payrolls, setPayrolls] = useState([]);
  const [selected, setSelected] = useState('');
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    inventoryApi.listPayrolls({ pageSize: 100 })
      .then((r) => {
        const list = (r.items || []).filter((p) => p.status === 'PAID');
        setPayrolls(list);
        if (list.length) setSelected(list[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setPayroll(null); return; }
    setDetailLoading(true);
    try {
      const data = await inventoryApi.getPayroll(id);
      setPayroll(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadDetail(selected); }, [selected, loadDetail]);

  return { payrolls, selected, setSelected, payroll, loading, detailLoading, error };
}
