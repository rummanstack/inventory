import { useState } from 'react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, todayISO } from '../../../utils/calculations.js';

const PAYMENT_METHODS = ['CASH', 'BANK', 'MOBILE_BANKING', 'CARD', 'CHEQUE', 'STORE_CREDIT', 'GIFT_VOUCHER'];

export default function CollectPaymentModal({ plan, onClose, onSave }) {
  const { t, language } = useInventoryApp();
  const [amount, setAmount] = useState(plan.outstandingAmount < plan.monthlyInstallmentAmount ? plan.outstandingAmount : plan.monthlyInstallmentAmount);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (Number(amount) <= 0) {
      setError(t('installments.payment.validation.amountRequired'));
      return;
    }

    setSaving(true);
    const result = await onSave({
      planId: plan.id,
      amount: Number(amount),
      paymentMethod,
      paymentDate,
      note: note.trim(),
    });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('installments.payment.saveFailed'));
    }
  }

  return (
    <Modal title={t('installments.payment.title')} description={`${plan.planNumber} · ${t('installments.plans.outstandingAmount')}: ${formatCurrency(plan.outstandingAmount, language)}`} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div>
          <label className="label">{t('installments.payment.amount')}</label>
          <input className="input" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div>
          <label className="label">{t('installments.payment.method')}</label>
          <Select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            {PAYMENT_METHODS.map((value) => (
              <option key={value} value={value}>{t(`installments.payment.methods.${value}`)}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="label">{t('installments.payment.date')}</label>
          <DatePickerField value={paymentDate} onChange={setPaymentDate} />
        </div>
        <div>
          <label className="label">{t('installments.payment.note')}</label>
          <textarea className="input min-h-16" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('installments.payment.submit')}</button>
        </div>
      </form>
    </Modal>
  );
}
