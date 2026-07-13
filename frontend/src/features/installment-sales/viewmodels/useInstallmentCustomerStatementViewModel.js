import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';

export function useInstallmentCustomerStatementViewModel() {
  const [customerId, setCustomerId] = useState('');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!customerId) {
      setStatement(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    inventoryApi
      .getInstallmentCustomerStatement({ customerId })
      .then((result) => {
        if (!cancelled) setStatement(result);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
          setStatement(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, version]);

  return {
    customerId,
    setCustomerId,
    statement,
    loading,
    error,
    refresh: () => setVersion((value) => value + 1),
  };
}
