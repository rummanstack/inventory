import { useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';

export function useGeneralLedgerViewModel() {
  const [accountCode, setAccountCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(todayISO);
  const accountsQuery = useTenantReportQuery({ scope: 'chart-of-accounts-reference', queryFn: () => inventoryApi.getChartOfAccounts() });
  const filters = { accountCode: accountCode || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  const ledgerQuery = useTenantReportQuery({ scope: 'general-ledger', params: filters, queryFn: () => inventoryApi.getGeneralLedger(filters), keepPrevious: true });

  return {
    accounts: accountsQuery.data?.accounts || [],
    accountsError: accountsQuery.error?.message || '',
    accountCode,
    setAccountCode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    ledgerLines: ledgerQuery.data?.lines || [],
    loading: ledgerQuery.isPending,
    error: ledgerQuery.error?.message || '',
  };
}
