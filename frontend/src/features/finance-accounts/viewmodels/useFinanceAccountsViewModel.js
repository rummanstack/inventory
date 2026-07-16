import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';
import { getActiveTenantId } from '../../../services/api/client.js';

export function useFinanceAccountsViewModel({ confirm }) {
  const { t, pushToast } = useInventoryApp();
  const [accountType, setAccountType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const accountsQuery = useTenantReportQuery({
    scope: 'finance-accounts',
    queryFn: () => inventoryApi.listFinanceAccounts(),
    staleTime: 30_000,
  });
  const dashboardQuery = useTenantReportQuery({
    scope: 'finance-account-due-totals',
    queryFn: () => inventoryApi.getFinanceDashboard(),
    staleTime: 30_000,
  });
  const actionMutation = useMutation({
    mutationKey: transactionKeys.mutation(getActiveTenantId(), 'finance-account-action'),
    mutationFn: ({ action, payload, transactionId, reason }) => {
      if (action === 'transaction') return inventoryApi.createFinanceAccountTransaction(payload);
      if (action === 'transfer') return inventoryApi.createFinanceAccountTransfer(payload);
      return inventoryApi.deleteFinanceAccountTransaction(transactionId, reason);
    },
  });

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listFinanceAccountTransactions({
      page,
      pageSize,
      accountType: accountType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [accountType, dateFrom, dateTo],
    'finance-account-transactions',
  );

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, dateFrom, dateTo]);

  async function refreshAll() {
    await Promise.all([accountsQuery.refetch(), dashboardQuery.refetch(), list.reload()]);
  }

  async function runSave(action, payload, titleKey) {
    try {
      await actionMutation.mutateAsync({ action, payload });
      await refreshAll();
      pushToast('success', t(titleKey), t('alerts.created'));
      return { ok: true };
    } catch (error) {
      pushToast('error', t('alerts.requestFailed'), error.message);
      return { ok: false, message: error.message };
    }
  }

  async function deleteTransaction(transactionId) {
    const { confirmed, reason } = await confirm({
      title: t('common.delete'),
      description: t('financeAccounts.deleteConfirm'),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) return;

    try {
      await actionMutation.mutateAsync({ action: 'delete', transactionId, reason });
      await refreshAll();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
    } catch (error) {
      pushToast('error', t('alerts.deleteFailed'), error.message);
    }
  }

  return {
    accounts: accountsQuery.data?.accounts || [],
    accountsLoading: accountsQuery.isPending,
    accountsError: accountsQuery.error?.message || '',
    totalDsrDue: dashboardQuery.data?.totalDsrDue || 0,
    totalCustomerDue: dashboardQuery.data?.totalCustomerDue || 0,
    accountType, setAccountType, dateFrom, setDateFrom, dateTo, setDateTo,
    saveTransaction: (payload) => runSave('transaction', payload, 'financeAccounts.addTransactionTitle'),
    saveTransfer: (payload) => runSave('transfer', payload, 'financeAccounts.transferTitle'),
    deleteTransaction,
    ...list,
  };
}
