import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { todayISO } from '../../../utils/calculations.js';
import { useFormState } from '../../../hooks/useFormState';

const MODULE_CONFIG = {
  cash: {
    titleAddKey: 'dsrFinance.addCashTitle',
    titleEditKey: 'dsrFinance.editCashTitle',
    descriptionKey: 'dsrFinance.cashModalDescription',
    saveLabelKey: 'dsrFinance.saveCash',
  },
  advance: {
    titleAddKey: 'dsrFinance.addAdvanceTitle',
    titleEditKey: 'dsrFinance.editAdvanceTitle',
    descriptionKey: 'dsrFinance.advanceModalDescription',
    saveLabelKey: 'dsrFinance.saveAdvance',
  },
};

export default function DsrFinanceFormModal({ kind, record, dsrs, defaultDate, defaultDsrId = '', onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(record);
  const config = MODULE_CONFIG[kind];
  const initialDate = record?.date || defaultDate || todayISO();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    date: initialDate,
    dsrId: record?.dsrId || defaultDsrId || dsrs[0]?.id || '',
    amount: record?.amount ?? '',
    note: record?.note || '',
  });
  const [reason, setReason] = useState('');

  const dsrOptions = useMemo(
    () => dsrs.map((dsr) => ({ value: dsr.id, label: `${dsr.name} - ${dsr.area}` })),
    [dsrs],
  );

  async function submitForm(event) {
    event.preventDefault();

    if (!form.date) {
      setError(t('dsrFinance.requiredDate'));
      return;
    }

    if (!form.dsrId) {
      setError(t('dsrFinance.requiredDsr'));
      return;
    }


    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError(t('dsrFinance.requiredAmount'));
      return;
    }

    if (isEdit && !reason.trim()) {
      setError(t('common.editReasonRequired'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: record?.id,
      date: form.date,
      dsrId: form.dsrId,
      amount,
      note: form.note.trim(),
      ...(isEdit ? { reason: reason.trim() } : {}),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('dsrFinance.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t(config.titleEditKey) : t(config.titleAddKey)} description={t(config.descriptionKey)} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{t('dsrFinance.date')}</label>
            <DatePickerField value={form.date} onChange={(value) => updateField('date', value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('dsrFinance.dsr')}</label>
            <select className="input" value={form.dsrId} onChange={(event) => updateField('dsrId', event.target.value)}>
              <option value="">{t('dsrFinance.selectDsr')}</option>
              {dsrOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('dsrFinance.amount')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t('dsrFinance.note')}</label>
            <textarea className="input min-h-28" value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('dsrFinance.notePlaceholder')} />
          </div>
          {isEdit ? (
            <div className="md:col-span-2">
              <label className="label">{t('common.editReasonLabel')}</label>
              <textarea className="input min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('common.editReasonPlaceholder')} />
            </div>
          ) : null}
        </div>
        {isEdit ? <AuditHistory entityType={kind === 'cash' ? 'dsr_cash_receipt' : 'dsr_advance'} entityId={record.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t(config.saveLabelKey)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
