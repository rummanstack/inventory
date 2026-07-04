import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';
import { formatCurrency, todayISO } from '../../../utils/calculations';

export default function AccountTransferFormModal({ accounts = [], onClose, onSave }) {
  const { t } = useInventoryApp();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    date: todayISO(),
    fromAccountType: 'CASH',
    toAccountType: 'BANK',
    amount: '',
    note: '',
  });

  const fromAccount = accounts.find((a) => a.type === form.fromAccountType);
  const fromBalance = Number(fromAccount?.balance || 0);

  function handleFromChange(value) {
    updateField('fromAccountType', value);
    updateField('toAccountType', value === 'CASH' ? 'BANK' : 'CASH');
  }

  async function submitForm(event) {
    event.preventDefault();

    if (!form.date) {
      setError(t('financeAccounts.requiredDate'));
      return;
    }

    if (form.fromAccountType === form.toAccountType) {
      setError(t('financeAccounts.sameAccount'));
      return;
    }

    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError(t('financeAccounts.requiredAmount'));
      return;
    }

    if (amount > fromBalance) {
      setError(`Insufficient balance. Available: ${formatCurrency(fromBalance)}`);
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      date: form.date,
      fromAccountType: form.fromAccountType,
      toAccountType: form.toAccountType,
      amount,
      note: form.note.trim(),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('financeAccounts.saveFailed'));
    }
  }

  return (
    <Modal title={t('financeAccounts.transferTitle')} description={t('financeAccounts.transferModalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{t('financeAccounts.date')}</label>
            <DatePickerField value={form.date} onChange={(value) => updateField('date', value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('financeAccounts.amount')}</label>
            <input className="input" type="number" min="0" step="0.0001" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('financeAccounts.fromAccount')}</label>
            <Select className="input" value={form.fromAccountType} onChange={(event) => handleFromChange(event.target.value)}>
              <option value="CASH">{t('financeAccounts.cashInHand')}</option>
              <option value="BANK">{t('financeAccounts.bank')}</option>
            </Select>
            {fromAccount ? (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Available: <span className={fromBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(fromBalance)}</span>
              </p>
            ) : null}
          </div>
          <div>
            <label className="label">{t('financeAccounts.toAccount')}</label>
            <input className="input" value={form.toAccountType === 'CASH' ? t('financeAccounts.cashInHand') : t('financeAccounts.bank')} disabled />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t('financeAccounts.note')}</label>
            <textarea className="input min-h-28" value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('financeAccounts.notePlaceholder')} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('financeAccounts.saveTransfer')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

