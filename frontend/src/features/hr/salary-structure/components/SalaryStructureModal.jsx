import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../../hooks/useFormState';
import { formatCurrency } from '../../../../utils/calculations.js';
import { inventoryApi } from '../../../../services/inventoryApi.js';

export default function SalaryStructureModal({ employee, structure, onClose, onSaved }) {
  const { t, language } = useInventoryApp();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    payType: structure?.payType || 'MONTHLY',
    basicPay: structure?.basicPay ?? '',
    effectiveFrom: structure?.effectiveFrom || new Date().toISOString().slice(0, 10),
  });
  const [allowances, setAllowances] = useState(structure?.allowances || []);
  const [deductions, setDeductions] = useState(structure?.deductions || []);

  function addAllowance() { setAllowances((p) => [...p, { label: '', amount: '' }]); }
  function removeAllowance(i) { setAllowances((p) => p.filter((_, idx) => idx !== i)); }
  function updateAllowance(i, field, val) {
    setAllowances((p) => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
  }
  function addDeduction() { setDeductions((p) => [...p, { label: '', amount: '' }]); }
  function removeDeduction(i) { setDeductions((p) => p.filter((_, idx) => idx !== i)); }
  function updateDeduction(i, field, val) {
    setDeductions((p) => p.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }

  const basicPayNum = Number(form.basicPay || 0);
  const allowanceTotal = allowances.reduce((s, a) => s + Number(a.amount || 0), 0);
  const deductionTotal = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
  const netPay = basicPayNum + allowanceTotal - deductionTotal;

  async function submitForm(e) {
    e.preventDefault();
    const basicPay = Number(form.basicPay || 0);
    if (basicPay <= 0) { setError(t('salaryStructure.basicRequired')); return; }
    setSaving(true);
    setError('');
    try {
      await inventoryApi.saveSalaryStructure(employee.id, {
        payType: form.payType,
        basicPay,
        effectiveFrom: form.effectiveFrom,
        allowances: allowances.filter((a) => a.label.trim()),
        deductions: deductions.filter((d) => d.label.trim()),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`${t('salaryStructure.title')} — ${employee.name}`}
      description={t('salaryStructure.modalDescription')}
      onClose={onClose}
      width="max-w-2xl"
    >
      <form className="space-y-5" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        {/* Core fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">{t('salaryStructure.payType')}</label>
            <select className="input" value={form.payType} onChange={(e) => updateField('payType', e.target.value)}>
              <option value="MONTHLY">{t('salaryStructure.monthly')}</option>
              <option value="DAILY">{t('salaryStructure.daily')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('salaryStructure.basicPay')} *</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.basicPay}
              onChange={(e) => updateField('basicPay', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">{t('salaryStructure.effectiveFrom')}</label>
            <input className="input" type="date" value={form.effectiveFrom}
              onChange={(e) => updateField('effectiveFrom', e.target.value)} />
          </div>
        </div>

        {/* Allowances */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-emerald-800">{t('salaryStructure.allowances')}</p>
              {allowanceTotal > 0 && (
                <p className="text-xs text-emerald-600">+{formatCurrency(allowanceTotal, language)} total</p>
              )}
            </div>
            <button type="button" className="btn-secondary h-7 gap-1 px-2.5 text-xs" onClick={addAllowance}>
              <Plus size={12} /> {t('common.add')}
            </button>
          </div>
          <div className="space-y-2">
            {allowances.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1 bg-white"
                  placeholder={t('salaryStructure.itemLabel')}
                  value={a.label}
                  onChange={(e) => updateAllowance(i, 'label', e.target.value)}
                />
                <input
                  className="input w-32 bg-white text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={a.amount}
                  onChange={(e) => updateAllowance(i, 'amount', e.target.value)}
                />
                <button type="button" className="icon-btn text-rose-500 hover:text-rose-700" onClick={() => removeAllowance(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!allowances.length && (
              <p className="text-xs italic text-emerald-600/60">{t('salaryStructure.noAllowances')}</p>
            )}
          </div>
        </div>

        {/* Deductions */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-rose-800">{t('salaryStructure.deductions')}</p>
              {deductionTotal > 0 && (
                <p className="text-xs text-rose-600">−{formatCurrency(deductionTotal, language)} total</p>
              )}
            </div>
            <button type="button" className="btn-secondary h-7 gap-1 px-2.5 text-xs" onClick={addDeduction}>
              <Plus size={12} /> {t('common.add')}
            </button>
          </div>
          <div className="space-y-2">
            {deductions.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1 bg-white"
                  placeholder={t('salaryStructure.itemLabel')}
                  value={d.label}
                  onChange={(e) => updateDeduction(i, 'label', e.target.value)}
                />
                <input
                  className="input w-32 bg-white text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={d.amount}
                  onChange={(e) => updateDeduction(i, 'amount', e.target.value)}
                />
                <button type="button" className="icon-btn text-rose-500 hover:text-rose-700" onClick={() => removeDeduction(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!deductions.length && (
              <p className="text-xs italic text-rose-600/60">{t('salaryStructure.noDeductions')}</p>
            )}
          </div>
        </div>

        {/* Live net pay summary */}
        {basicPayNum > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Net Pay Breakdown</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Basic Pay</span>
                <span className="font-semibold">{formatCurrency(basicPayNum, language)}</span>
              </div>
              {allowanceTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Allowances</span>
                  <span className="font-semibold">+{formatCurrency(allowanceTotal, language)}</span>
                </div>
              )}
              {deductionTotal > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>− Deductions</span>
                  <span className="font-semibold">−{formatCurrency(deductionTotal, language)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-black text-slate-950">
                <span>Net Pay</span>
                <span>{formatCurrency(netPay, language)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
