import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

export function useJournalViewModel() {
  const [tab, setTab] = useState('trial-balance');

  const [accounts, setAccounts] = useState([]);
  const [accountsError, setAccountsError] = useState('');

  const [asOfDate, setAsOfDate] = useState(todayISO);
  const [trialBalance, setTrialBalance] = useState(null);
  const [trialBalanceLoading, setTrialBalanceLoading] = useState(true);
  const [trialBalanceError, setTrialBalanceError] = useState('');

  const [accountCode, setAccountCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(todayISO);
  const [ledgerLines, setLedgerLines] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState('');

  useEffect(() => {
    let cancelled = false;
    inventoryApi.getChartOfAccounts()
      .then((result) => {
        if (!cancelled) setAccounts(result.accounts || []);
      })
      .catch((error) => {
        if (!cancelled) setAccountsError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== 'trial-balance') return;
    let cancelled = false;
    setTrialBalanceLoading(true);
    setTrialBalanceError('');
    inventoryApi.getTrialBalance({ dateTo: asOfDate })
      .then((result) => {
        if (!cancelled) setTrialBalance(result);
      })
      .catch((error) => {
        if (!cancelled) setTrialBalanceError(error.message);
      })
      .finally(() => {
        if (!cancelled) setTrialBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, asOfDate]);

  useEffect(() => {
    if (tab !== 'general-ledger') return;
    let cancelled = false;
    setLedgerLoading(true);
    setLedgerError('');
    inventoryApi.getGeneralLedger({ accountCode: accountCode || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then((result) => {
        if (!cancelled) setLedgerLines(result.lines || []);
      })
      .catch((error) => {
        if (!cancelled) setLedgerError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLedgerLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, accountCode, dateFrom, dateTo]);

  return {
    tab,
    setTab,
    accounts,
    accountsError,
    asOfDate,
    setAsOfDate,
    trialBalance,
    trialBalanceLoading,
    trialBalanceError,
    accountCode,
    setAccountCode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ledgerLines,
    ledgerLoading,
    ledgerError,
  };
}
