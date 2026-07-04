import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { useFormState } from '../../../hooks/useFormState';

const EXPENSE_CATEGORY_KEYS = [
  ['Office', 'expenses.categories.office'],
  ['Rent', 'expenses.categories.rent'],
  ['Vehicle', 'expenses.categories.vehicle'],
  ['Load/Unload', 'expenses.categories.loadUnload'],
  ['Other', 'expenses.categories.other'],
];

export default function ExpenseFormModal({ expense, defaultDate, onClose, onSave }) {
  const { t, pushToast } = useInventoryApp();
  const isEdit = Boolean(expense);
  const initialDate = expense?.date || defaultDate;
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    date: initialDate,
    category: (expense?.category && expense.category !== 'Bank') ? expense.category : 'Office',
    amount: expense?.amount ?? '',
    note: expense?.note || '',
  });
  const [reason, setReason] = useState('');

  const categoryOptions = useMemo(
    () => EXPENSE_CATEGORY_KEYS.map(([value, labelKey]) => ({ value, label: t(labelKey) })),
    [t],
  );

  async function submitForm(event) {
    event.preventDefault();

    if (!form.date) {
      setError(t('expenses.requiredDate'));
      return;
    }

    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError(t('expenses.requiredAmount'));
      return;
    }

    if (isEdit && !reason.trim()) {
      setError(t('common.editReasonRequired'));
      return;
    }

    if (isEdit) {
      const unchanged =
        form.date === expense.date &&
        form.category === expense.category &&
        amount === Number(expense.amount) &&
        form.note.trim() === (expense.note || '');
      if (unchanged) {
        pushToast('info', t('expenses.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: expense?.id,
      date: form.date,
      category: form.category,
      amount,
      note: form.note.trim(),
      ...(isEdit ? { reason: reason.trim() } : {}),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('expenses.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('expenses.editTitle') : t('expenses.addTitle')} description={t('expenses.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{t('expenses.date')}</label>
            <DatePickerField value={form.date} onChange={(value) => updateField('date', value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('expenses.category')}</label>
            <Select className="input" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('expenses.amount')}</label>
            <input className="input" type="number" min="0" step="0.0001" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t('expenses.note')}</label>
            <textarea className="input min-h-28" value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('expenses.notePlaceholder')} />
          </div>
          {isEdit ? (
            <div className="md:col-span-2">
              <label className="label">{t('common.editReasonLabel')}</label>
              <textarea className="input min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('common.editReasonPlaceholder')} />
            </div>
          ) : null}
        </div>
        {isEdit ? <AuditHistory entityType="expense" entityId={expense.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('expenses.saveExpense')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

