import { useEffect, useState } from 'react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations';

export function useExpenseViewModel({ confirm }) {
  const { t, pushToast } = useInventoryApp();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReport(nextDate = date, nextMonth = month) {
    try {
      setLoading(true);
      setError('');
      const nextReport = await inventoryApi.getExpenseReport({ date: nextDate, month: nextMonth });
      setReport(nextReport);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(date, month);
  }, [date, month]);

  async function refreshReport() {
    await loadReport(date, month);
  }

  async function saveExpense(expense) {
    try {
      const response = expense.id ? await inventoryApi.updateExpense(expense) : await inventoryApi.createExpense(expense);
      await refreshReport();
      pushToast('success', expense.id ? t('expenses.editTitle') : t('expenses.addTitle'), expense.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true, expense: response.expense };
    } catch (requestError) {
      pushToast('error', t('alerts.requestFailed'), requestError.message);
      return { ok: false, message: requestError.message };
    }
  }

  async function deleteExpense(expenseId, confirmOptions) {
    const { confirmed, reason } = await confirm(confirmOptions);
    if (!confirmed) {
      return;
    }

    try {
      await inventoryApi.deleteExpense(expenseId, reason);
      await refreshReport();
      pushToast('success', t('common.delete'), t('alerts.deleted'));
    } catch (requestError) {
      setError(requestError.message);
      pushToast('error', t('alerts.deleteFailed'), requestError.message);
    }
  }

  return {
    date,
    month,
    setDate,
    setMonth,
    report,
    loading,
    error,
    setError,
    refreshReport,
    saveExpense,
    deleteExpense,
  };
}
