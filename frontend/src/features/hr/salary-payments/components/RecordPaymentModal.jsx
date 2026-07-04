import { useState } from 'react';
import { AlertTriangle, Save, Zap } from 'lucide-react';
import { Alert, Modal, Select } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { formatCurrency } from '../../../../utils/calculations.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';

export default function RecordPaymentModal({ employee, onClose, onSaved }) {
  const { t, language } = useInventoryApp();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const salaryAmount = Number(employee?.salaryAmount || 0);
  const earnedAmount = employee?.earnedAmount !== null && employee?.earnedAmount !== undefined
    ? Number(employee.earnedAmount)
    : salaryAmount;
  const totalPaid = Number(employee?.totalPaid || 0);
  const remaining = employee?.remaining !== null && employee?.remaining !== undefined
    ? Number(employee.remaining)
    : (employee?.payType === 'MONTHLY' ? earnedAmount - totalPaid : null);
  const enteredAmount = Number(amount) || 0;
  const isOverpay = remaining !== null && enteredAmount > remaining && enteredAmount > 0;

  const isMonthly = employee?.payType === 'MONTHLY';

  function fillRemaining() {
    if (remaining !== null && remaining > 0) setAmount(String(remaining));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!enteredAmount || enteredAmount <= 0) {
      setError(t('salary.amountRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await inventoryApi.recordSalaryPayment({
        employeeId: employee.employeeId,
        amount: enteredAmount,
        paymentMethod,
        paymentDate,
        note: note.trim(),
      });
      onSaved?.();
    } catch (err) {
      setError(err?.message || t('salary.saveFailed'));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={t('salary.recordPaymentTitle')}
      description={employee?.employeeName}
      onClose={onClose}
      width="max-w-md"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}

        {/* Salary summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {employee?.activeDays !== null && employee?.activeDays !== undefined ? 'Earned' : (isMonthly ? t('salary.monthlySalary') : 'Salary')}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-800">{formatCurrency(earnedAmount, language)}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {employee?.activeDays !== null && employee?.activeDays !== undefined
                ? `${employee.activeDays} / ${employee.daysInMonth} days`
                : t(`salary.payType.${employee?.payType || 'MONTHLY'}`)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">{t('salary.paidThisMonth')}</p>
            <p className="mt-1 text-base font-semibold text-emerald-700">{formatCurrency(totalPaid, language)}</p>
          </div>
          {remaining !== null ? (
            <div className={`rounded-2xl border px-3 py-3 text-center ${remaining <= 0 ? 'border-rose-200 bg-rose-50' : 'border-indigo-200 bg-indigo-50'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${remaining <= 0 ? 'text-rose-400' : 'text-indigo-500'}`}>
                {remaining <= 0 ? t('salary.overpaid') : t('salary.remaining')}
              </p>
              <p className={`mt-1 text-base font-semibold ${remaining <= 0 ? 'text-rose-700' : 'text-indigo-700'}`}>
                {formatCurrency(Math.abs(remaining), language)}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('salary.totalPaid')}</p>
              <p className="mt-1 text-base font-semibold text-slate-700">{formatCurrency(totalPaid, language)}</p>
            </div>
          )}
        </div>

        {isOverpay && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-800">
              {t('salary.overpayWarning').replace('{remaining}', formatCurrency(remaining, language))}
            </p>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">{t('salary.amount')} *</label>
            {remaining !== null && remaining > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                onClick={fillRemaining}
              >
                <Zap size={11} />
                Fill remaining ({formatCurrency(remaining, language)})
              </button>
            )}
          </div>
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('salary.paymentMethod')}</label>
            <Select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">{t('common.cash')}</option>
              <option value="BANK">{t('common.bank')}</option>
            </Select>
          </div>
          <div>
            <label className="label">{t('salary.paymentDate')}</label>
            <input className="input" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">{t('salary.note')}</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('salary.notePlaceholder')} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={16} />
            {saving ? t('common.saving') : t('salary.recordPayment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

