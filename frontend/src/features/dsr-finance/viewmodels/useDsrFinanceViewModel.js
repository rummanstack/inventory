import { useEffect, useState } from 'react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

const RECORD_APIS = {
  advance: { create: 'createAdvance', update: 'updateAdvance', remove: 'deleteAdvance' },
};

export function useDsrFinanceViewModel(kind, { confirm }) {
  const { t, pushToast } = useInventoryApp();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dsrId, setDsrId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const api = RECORD_APIS[kind];

  async function loadReport(nextDate = date, nextMonth = month, nextDsrId = dsrId) {
    try {
      setLoading(true);
      setError('');
      const nextReport = await inventoryApi.getAdvanceReport({ date: nextDate, month: nextMonth, dsrId: nextDsrId });
      setReport(nextReport);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(date, month, dsrId);
  }, [kind, date, month, dsrId]);

  async function refreshReport() {
    await loadReport(date, month, dsrId);
  }

  async function saveRecord(record) {
    try {
      const action = record.id ? api.update : api.create;
      await inventoryApi[action](record);
      await refreshReport();
      pushToast('success', t('nav.dsrFinance'), record.id ? t('alerts.updated') : t('alerts.created'));
      return { ok: true };
    } catch (requestError) {
      pushToast('error', t('alerts.requestFailed'), requestError.message);
      return { ok: false, message: requestError.message };
    }
  }

  async function deleteRecord(recordId, confirmOptions) {
    const { confirmed } = await confirm(confirmOptions);
    if (!confirmed) {
      return;
    }

    try {
      await inventoryApi[api.remove](recordId);
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
    dsrId,
    setDate,
    setMonth,
    setDsrId,
    report,
    loading,
    error,
    setError,
    refreshReport,
    saveRecord,
    deleteRecord,
  };
}
