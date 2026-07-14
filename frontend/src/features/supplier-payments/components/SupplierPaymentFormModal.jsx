import { useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { formatCurrency, todayISO } from '../../../utils/calculations.js';
import { useFormState } from '../../../hooks/useFormState';

const PAYMENT_METHODS = ['CASH', 'BANK'];

export default function SupplierPaymentFormModal({ payment, onClose, onSave }) {
  const { t, pushToast, supplierDirectory } = useInventoryApp();
  const isEdit = Boolean(payment);
  const formRef = useRef(null);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    supplierId: payment?.supplierId || '',
    paymentDate: payment?.paymentDate || todayISO(),
    amount: payment?.amount ?? '',
    paymentMethod: payment?.paymentMethod || 'CASH',
    note: payment?.note || '',
  });
  const [reason, setReason] = useState('');
  const selectedSupplier = supplierDirectory.find((supplier) => supplier.id === form.supplierId) || null;
  const currentDue = Number(selectedSupplier?.currentDue || 0);
  // When editing, this payment's own amount is already netted out of the supplier's
  // currentDue snapshot, so add it back before subtracting the (possibly changed) amount.
  const dueBaseline = isEdit ? currentDue + Number(payment?.amount || 0) : currentDue;
  const dueAfterPayment = dueBaseline - (Number(form.amount) || 0);

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

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey) && !saving) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saving]);

  return (
    <Modal title={isEdit ? t('supplierPayments.editTitle') : t('supplierPayments.addTitle')} description={t('supplierPayments.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form ref={formRef} className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('supplierPayments.supplierLabel')}</label>
            <Select className="input" value={form.supplierId} onChange={(event) => updateField('supplierId', event.target.value)}>
              <option value="">{t('supplierPayments.selectSupplier')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
          </div>
          {selectedSupplier ? (
            <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('suppliers.currentDueLabel')}</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(dueBaseline)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('supplierPayments.dueAfterPaymentLabel')}</p>
                <p className={`mt-1 text-lg font-semibold ${dueAfterPayment < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(dueAfterPayment)}</p>
              </div>
            </div>
          ) : null}
          <div>
            <label className="label">{t('supplierPayments.paymentDateLabel')}</label>
            <DatePickerField value={form.paymentDate} onChange={(value) => updateField('paymentDate', value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="label">{t('supplierPayments.amountLabel')}</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">{t('supplierPayments.paymentMethodLabel')}</label>
            <Select className="input" value={form.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{t(`purchaseReceive.paymentMethods.${method}`)}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('supplierPayments.noteLabel')}</label>
            <textarea className="input min-h-28" value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('supplierPayments.noteLabel')} />
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
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Ctrl+S</kbd>
          </button>
        </div>
      </form>
    </Modal>
  );
}

