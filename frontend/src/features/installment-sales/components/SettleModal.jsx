import { useMemo, useState } from 'react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, todayISO } from '../../../utils/calculations.js';
import { round2 } from '../utils/scheduleMath.js';

const PAYMENT_METHODS = ['CASH', 'BANK'];

export default function SettleModal({ plan, onClose, onSave }) {
  const { t, language } = useInventoryApp();
  const [settlementDate, setSettlementDate] = useState(todayISO());
  const [discount, setDiscount] = useState(0);
  const [waiveMarkup, setWaiveMarkup] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const remainingMarkup = plan.finalPayableAmount > 0
    ? round2((plan.outstandingAmount * plan.markupAmount) / plan.finalPayableAmount)
    : 0;
  const waivedMarkup = waiveMarkup ? remainingMarkup : 0;
  const cashAmount = useMemo(
    () => round2(Math.max(0, plan.outstandingAmount - waivedMarkup - Number(discount || 0))),
    [plan.outstandingAmount, waivedMarkup, discount],
  );

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (Number(discount || 0) + waivedMarkup > plan.outstandingAmount + 0.01) {
      setError(t('installments.detail.settleValidation.discountTooHigh'));
      return;
    }

    setSaving(true);
    const result = await onSave({
      settlementDate,
      discount: Number(discount || 0),
      waiveMarkup,
      paymentMethod,
    });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('installments.detail.settleFailed'));
    }
  }

  return (
    <Modal title={t('installments.detail.settle')} description={plan.planNumber} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{t('installments.plans.outstandingAmount')}</span>
            <span className="font-bold text-slate-950">{formatCurrency(plan.outstandingAmount, language)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-slate-500">{t('installments.detail.remainingMarkup')}</span>
            <span className="font-semibold text-slate-700">{formatCurrency(remainingMarkup, language)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-bold text-slate-950">{t('installments.detail.amountDueNow')}</span>
            <span className="font-bold text-emerald-700">{formatCurrency(cashAmount, language)}</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('installments.detail.settlementDate')}</label>
            <DatePickerField value={settlementDate} onChange={setSettlementDate} />
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
            <label className="label">{t('installments.plans.discount')}</label>
            <input className="input" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            type="checkbox"
            checked={waiveMarkup}
            onChange={(event) => setWaiveMarkup(event.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-950">{t('installments.detail.waiveRemainingMarkup')}</span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('installments.detail.settle')}</button>
        </div>
      </form>
    </Modal>
  );
}
