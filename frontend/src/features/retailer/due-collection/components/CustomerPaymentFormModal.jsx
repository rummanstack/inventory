import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../../components/AuditHistory.jsx';
import { todayISO } from '../../../../utils/calculations.js';
import { useFormState } from '../../../../hooks/useFormState';

const PAYMENT_METHODS = ['CASH', 'MOBILE_BANKING', 'CHEQUE'];

export default function CustomerPaymentFormModal({ payment, onClose, onSave }) {
  const { t, pushToast, customerDirectory } = useInventoryApp();
  const isEdit = Boolean(payment);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    customerId: payment?.customerId || '',
    paymentDate: payment?.paymentDate || todayISO(),
    amount: payment?.amount ?? '',
    paymentMethod: payment?.paymentMethod || 'CASH',
    note: payment?.note || '',
  });
  const [reason, setReason] = useState('');

  async function submitForm(event) {
    event.preventDefault();

    if (!form.customerId) {
      setError(t('retailer.dueCollection.customerRequired'));
      return;
    }

    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError(t('retailer.dueCollection.amountRequired'));
      return;
    }

    if (isEdit && !reason.trim()) {
      setError(t('common.editReasonRequired'));
      return;
    }

    if (isEdit) {
      const unchanged =
        form.customerId === payment.customerId &&
        form.paymentDate === payment.paymentDate &&
        amount === Number(payment.amount) &&
        form.paymentMethod === payment.paymentMethod &&
        form.note.trim() === (payment.note || '');
      if (unchanged) {
        pushToast('info', t('retailer.dueCollection.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: payment?.id,
      customerId: form.customerId,
      paymentDate: form.paymentDate,
      amount,
      paymentMethod: form.paymentMethod,
      note: form.note.trim(),
      ...(isEdit ? { reason: reason.trim() } : {}),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('retailer.dueCollection.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('retailer.dueCollection.editTitle') : t('retailer.dueCollection.addTitle')} description={t('retailer.dueCollection.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('retailer.shared.customerLabel')}</label>
            <select className="input" value={form.customerId} onChange={(event) => updateField('customerId', event.target.value)} disabled={isEdit}>
              <option value="">{t('retailer.shared.selectCustomer')}</option>
              {customerDirectory.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.shopName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('supplierPayments.paymentDateLabel')}</label>
            <DatePickerField value={form.paymentDate} onChange={(value) => updateField('paymentDate', value)} />
          </div>
          <div>
            <label className="label">{t('supplierPayments.amountLabel')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">{t('supplierPayments.paymentMethodLabel')}</label>
            <select className="input" value={form.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{t(`purchaseReceive.paymentMethods.${method}`)}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('supplierPayments.noteLabel')}</label>
            <textarea className="input" rows={3} value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('supplierPayments.noteLabel')} />
          </div>
          {isEdit ? (
            <div className="sm:col-span-2">
              <label className="label">{t('common.editReasonLabel')}</label>
              <textarea className="input min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('common.editReasonPlaceholder')} />
            </div>
          ) : null}
        </div>
        {isEdit ? <AuditHistory entityType="customer_payment" entityId={payment.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('retailer.dueCollection.savePayment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
