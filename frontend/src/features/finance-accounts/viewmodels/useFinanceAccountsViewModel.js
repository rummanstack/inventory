import { useCallback, useEffect, useState } from 'react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { usePagedList } from '../../../hooks/usePagedList';
import { useRefetchOnVisible } from '../../../app/hooks/useRefetchOnVisible.js';

export function useFinanceAccountsViewModel({ confirm }) {
  const { t, pushToast } = useInventoryApp();
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [accountType, setAccountType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [totalDsrDue, setTotalDsrDue] = useState(0);
  const [totalCustomerDue, setTotalCustomerDue] = useState(0);

  const loadAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      setAccountsError('');
      const result = await inventoryApi.listFinanceAccounts();
      setAccounts(result.accounts || []);
    } catch (requestError) {
      setAccountsError(requestError.message);
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    inventoryApi
      .getFinanceDashboard()
      .then((result) => {
        setTotalDsrDue(result?.totalDsrDue || 0);
        setTotalCustomerDue(result?.totalCustomerDue || 0);
      })
      .catch(() => {
        setTotalDsrDue(0);
        setTotalCustomerDue(0);
      });
  }, []);

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listFinanceAccountTransactions({
      page,
      pageSize,
      accountType: accountType || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [accountType, dateFrom, dateTo],
  );

  useEffect(() => {
    list.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, dateFrom, dateTo]);

  async function refreshAll() {
    await Promise.all([loadAccounts(), list.reload()]);
  }

  useRefetchOnVisible(loadAccounts);

  async function saveTransaction(payload) {
    try {
      await inventoryApi.createFinanceAccountTransaction(payload);
      await loadAccounts();
      list.reload();
      pushToast('success', t('financeAccounts.addTransactionTitle'), t('alerts.created'));
      return { ok: true };
    } catch (requestError) {
      pushToast('error', t('alerts.requestFailed'), requestError.message);
      return { ok: false, message: requestError.message };
    }
  }

  async function saveTransfer(payload) {
    try {
      await inventoryApi.createFinanceAccountTransfer(payload);
      await loadAccounts();
      list.reload();
      pushToast('success', t('financeAccounts.transferTitle'), t('alerts.created'));
      return { ok: true };
    } catch (requestError) {
      pushToast('error', t('alerts.requestFailed'), requestError.message);
      return { ok: false, message: requestError.message };
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
    if (!confirmed) {
      return;
    }

    try {
      await inventoryApi.deleteFinanceAccountTransaction(transactionId, reason);
      await refreshAll();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
    } catch (requestError) {
      pushToast('error', t('alerts.deleteFailed'), requestError.message);
    }
  }

  return {
    accounts,
    accountsLoading,
    accountsError,
    totalDsrDue,
    totalCustomerDue,
    accountType,
    setAccountType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    saveTransaction,
    saveTransfer,
    deleteTransaction,
    ...list,
  };
}
