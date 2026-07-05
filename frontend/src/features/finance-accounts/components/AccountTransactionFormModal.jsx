import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';
import { todayISO } from '../../../utils/calculations';

export default function AccountTransactionFormModal({ onClose, onSave }) {
  const { t } = useInventoryApp();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    date: todayISO(),
    accountType: 'CASH',
    type: 'DEPOSIT',
    amount: '',
    note: '',
  });

  async function submitForm(event) {
    event.preventDefault();

    if (!form.date) {
      setError(t('financeAccounts.requiredDate'));
      return;
    }

    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError(t('financeAccounts.requiredAmount'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      date: form.date,
      accountType: form.accountType,
      type: form.type,
      amount,
      note: form.note.trim(),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('financeAccounts.saveFailed'));
    }
  }

  return (
    <Modal title={t('financeAccounts.addTransactionTitle')} description={t('financeAccounts.transactionModalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{t('financeAccounts.date')}</label>
            <DatePickerField value={form.date} onChange={(value) => updateField('date', value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('financeAccounts.account')}</label>
            <Select className="input" value={form.accountType} onChange={(event) => updateField('accountType', event.target.value)}>
              <option value="CASH">{t('financeAccounts.cashInHand')}</option>
              <option value="BANK">{t('financeAccounts.bank')}</option>
            </Select>
          </div>
          <div>
            <label className="label">{t('financeAccounts.type')}</label>
            <Select className="input" value={form.type} onChange={(event) => updateField('type', event.target.value)}>
              <option value="DEPOSIT">{t('financeAccounts.deposit')}</option>
              <option value="WITHDRAWAL">{t('financeAccounts.withdrawal')}</option>
            </Select>
          </div>
          <div>
            <label className="label">{t('financeAccounts.amount')}</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} />
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
            {saving ? t('common.saving') : t('financeAccounts.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

