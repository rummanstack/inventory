import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { todayISO } from '../../../utils/calculations.js';
import { useFormState } from '../../../hooks/useFormState';

const PAYMENT_METHODS = ['CASH', 'BANK', 'MOBILE_BANKING', 'CHEQUE'];

export default function SupplierPaymentFormModal({ payment, onClose, onSave }) {
  const { t, pushToast, supplierDirectory } = useInventoryApp();
  const isEdit = Boolean(payment);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    supplierId: payment?.supplierId || '',
    paymentDate: payment?.paymentDate || todayISO(),
    amount: payment?.amount ?? '',
    paymentMethod: payment?.paymentMethod || 'CASH',
    note: payment?.note || '',
  });
  const [reason, setReason] = useState('');

  async function submitForm(event) {
    event.preventDefault();

    if (!form.supplierId) {
      setError(t('supplierPayments.supplierRequired'));
      return;
    }

    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError(t('supplierPayments.amountRequired'));
      return;
    }

    if (isEdit && !reason.trim()) {
      setError(t('common.editReasonRequired'));
      return;
    }

    if (isEdit) {
      const unchanged =
        form.supplierId === payment.supplierId &&
        form.paymentDate === payment.paymentDate &&
        amount === Number(payment.amount) &&
        form.paymentMethod === payment.paymentMethod &&
        form.note.trim() === (payment.note || '');
      if (unchanged) {
        pushToast('info', t('supplierPayments.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: payment?.id,
      supplierId: form.supplierId,
      paymentDate: form.paymentDate,
      amount,
      paymentMethod: form.paymentMethod,
      note: form.note.trim(),
      ...(isEdit ? { reason: reason.trim() } : {}),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('supplierPayments.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('supplierPayments.editTitle') : t('supplierPayments.addTitle')} description={t('supplierPayments.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('supplierPayments.supplierLabel')}</label>
            <select className="input" value={form.supplierId} onChange={(event) => updateField('supplierId', event.target.value)}>
              <option value="">{t('supplierPayments.selectSupplier')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
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
        {isEdit ? <AuditHistory entityType="supplier_payment" entityId={payment.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('supplierPayments.savePayment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
