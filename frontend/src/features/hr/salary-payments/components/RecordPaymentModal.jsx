import { useState } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
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
  const totalPaid = Number(employee?.totalPaid || 0);
  const remaining = employee?.payType === 'MONTHLY' ? salaryAmount - totalPaid : null;
  const enteredAmount = Number(amount) || 0;
  const isOverpay = remaining !== null && enteredAmount > remaining && enteredAmount > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!enteredAmount || enteredAmount <= 0) { setError(t('salary.amountRequired')); return; }
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
      onClose();
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
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{t('salary.monthlySalary')}</p>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(salaryAmount, language)}</p>
            <p className="text-[10px] text-slate-400">{t(`salary.payType.${employee?.payType || 'MONTHLY'}`)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-500">{t('salary.paidThisMonth')}</p>
            <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalPaid, language)}</p>
          </div>
          {remaining !== null ? (
            <div className={`rounded-xl border px-3 py-2 ${remaining >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-wide ${remaining >= 0 ? 'text-indigo-500' : 'text-amber-500'}`}>{t('salary.remaining')}</p>
              <p className={`text-sm font-bold ${remaining >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>{formatCurrency(Math.abs(remaining), language)}</p>
              {remaining < 0 && <p className="text-[10px] text-amber-500">{t('salary.overpaid')}</p>}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{t('salary.totalPaid')}</p>
              <p className="text-sm font-bold text-slate-700">{formatCurrency(totalPaid, language)}</p>
            </div>
          )}
        </div>

        {isOverpay && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">{t('salary.overpayWarning').replace('{remaining}', formatCurrency(remaining, language))}</p>
          </div>
        )}

        <div>
          <label className="label">{t('salary.amount')} *</label>
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('salary.paymentMethod')}</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">{t('common.cash')}</option>
              <option value="BANK">{t('common.bank')}</option>
            </select>
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
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={16} />
            {saving ? t('common.saving') : t('salary.recordPayment')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
