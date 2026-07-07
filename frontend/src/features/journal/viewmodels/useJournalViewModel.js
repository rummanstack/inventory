import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

function defaultMonthStart() {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

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

  const [balanceSheet, setBalanceSheet] = useState(null);
  const [balanceSheetLoading, setBalanceSheetLoading] = useState(true);
  const [balanceSheetError, setBalanceSheetError] = useState('');

  const [plDateFrom, setPlDateFrom] = useState(defaultMonthStart);
  const [plDateTo, setPlDateTo] = useState(todayISO);
  const [profitAndLoss, setProfitAndLoss] = useState(null);
  const [profitAndLossLoading, setProfitAndLossLoading] = useState(true);
  const [profitAndLossError, setProfitAndLossError] = useState('');

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

  useEffect(() => {
    if (tab !== 'balance-sheet') return;
    let cancelled = false;
    setBalanceSheetLoading(true);
    setBalanceSheetError('');
    inventoryApi.getBalanceSheet({ dateTo: asOfDate })
      .then((result) => {
        if (!cancelled) setBalanceSheet(result);
      })
      .catch((error) => {
        if (!cancelled) setBalanceSheetError(error.message);
      })
      .finally(() => {
        if (!cancelled) setBalanceSheetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, asOfDate]);

  useEffect(() => {
    if (tab !== 'profit-and-loss') return;
    let cancelled = false;
    setProfitAndLossLoading(true);
    setProfitAndLossError('');
    inventoryApi.getProfitAndLoss({ dateFrom: plDateFrom || undefined, dateTo: plDateTo || undefined })
      .then((result) => {
        if (!cancelled) setProfitAndLoss(result);
      })
      .catch((error) => {
        if (!cancelled) setProfitAndLossError(error.message);
      })
      .finally(() => {
        if (!cancelled) setProfitAndLossLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, plDateFrom, plDateTo]);

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
    balanceSheet,
    balanceSheetLoading,
    balanceSheetError,
    plDateFrom,
    setPlDateFrom,
    plDateTo,
    setPlDateTo,
    profitAndLoss,
    profitAndLossLoading,
    profitAndLossError,
  };
}
