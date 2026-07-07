import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

export function useGeneralLedgerViewModel() {
  const [accounts, setAccounts] = useState([]);
  const [accountsError, setAccountsError] = useState('');

  const [accountCode, setAccountCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(todayISO);
  const [ledgerLines, setLedgerLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    inventoryApi.getChartOfAccounts()
      .then((result) => {
        if (!cancelled) setAccounts(result.accounts || []);
      })
      .catch((err) => {
        if (!cancelled) setAccountsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    inventoryApi.getGeneralLedger({ accountCode: accountCode || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((result) => {
        if (!cancelled) setLedgerLines(result.lines || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountCode, dateFrom, dateTo]);

  return {
    accounts,
    accountsError,
    accountCode,
    setAccountCode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ledgerLines,
    loading,
    error,
  };
}
