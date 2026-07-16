import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations';
import { useTenantReportQuery } from '../../reports/queries/useTenantReportQuery.js';
import { transactionKeys } from '../../transactions/queries/transactionQueries.js';

export function useExpenseViewModel({ confirm }) {
  const { t, pushToast, tenant, user } = useInventoryApp();
  const today = todayISO();
  const tenantId = tenant?.id || user?.tenantId || '';
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [actionError, setActionError] = useState('');
  const reportQuery = useTenantReportQuery({
    scope: 'expense-report',
    params: { date, month },
    queryFn: () => inventoryApi.getExpenseReport({ date, month }),
    keepPrevious: true,
  });
  const saveMutation = useMutation({
    mutationKey: transactionKeys.mutation(tenantId, 'save-expense'),
    mutationFn: (expense) => expense.id
      ? inventoryApi.updateExpense(expense)
      : inventoryApi.createExpense(expense),
  });
  const deleteMutation = useMutation({
    mutationKey: transactionKeys.mutation(tenantId, 'delete-expense'),
    mutationFn: ({ expenseId, reason }) => inventoryApi.deleteExpense(expenseId, reason),
  });

  async function saveExpense(expense) {
    try {
      const response = await saveMutation.mutateAsync(expense);
      await reportQuery.refetch();
      pushToast('success', expense.id ? t('expenses.editTitle') : t('expenses.addTitle'), expense.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, expense: response.expense };
    } catch (requestError) {
      pushToast('error', t('alerts.requestFailed'), requestError.message);
      return { ok: false, message: requestError.message };
    }
  }

  async function deleteExpense(expenseId, confirmOptions) {
    const { confirmed, reason } = await confirm(confirmOptions);
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync({ expenseId, reason });
      await reportQuery.refetch();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
    } catch (requestError) {
      setActionError(requestError.message);
      pushToast('error', t('alerts.deleteFailed'), requestError.message);
    }
  }

  return {
    date,
    month,
    setDate,
    setMonth,
    report: reportQuery.data || null,
    loading: reportQuery.isPending,
    error: actionError || reportQuery.error?.message || '',
    setError: setActionError,
    refreshReport: reportQuery.refetch,
    saveExpense,
    deleteExpense,
  };
}
