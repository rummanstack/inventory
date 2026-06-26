import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../../hooks/useFormState';
import { inventoryApi } from '../../../../services/inventoryApi.js';

export default function SalaryStructureModal({ employee, structure, onClose, onSaved }) {
  const { t } = useInventoryApp();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    payType: structure?.payType || 'MONTHLY',
    basicPay: structure?.basicPay ?? 0,
    effectiveFrom: structure?.effectiveFrom || new Date().toISOString().slice(0, 10),
  });
  const [allowances, setAllowances] = useState(structure?.allowances || []);
  const [deductions, setDeductions] = useState(structure?.deductions || []);

  function addAllowance() { setAllowances((p) => [...p, { label: '', amount: 0 }]); }
  function removeAllowance(i) { setAllowances((p) => p.filter((_, idx) => idx !== i)); }
  function updateAllowance(i, field, val) {
    setAllowances((p) => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
  }
  function addDeduction() { setDeductions((p) => [...p, { label: '', amount: 0 }]); }
  function removeDeduction(i) { setDeductions((p) => p.filter((_, idx) => idx !== i)); }
  function updateDeduction(i, field, val) {
    setDeductions((p) => p.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }

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
            <input className="input" type="number" min="0" step="0.01" value={form.basicPay}
              onChange={(e) => updateField('basicPay', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('salaryStructure.effectiveFrom')}</label>
            <input className="input" type="date" value={form.effectiveFrom}
              onChange={(e) => updateField('effectiveFrom', e.target.value)} />
          </div>
        </div>

        {/* Allowances */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label mb-0">{t('salaryStructure.allowances')}</p>
            <button type="button" className="btn-secondary h-7 gap-1 px-2 text-xs" onClick={addAllowance}>
              <Plus size={12} /> {t('common.add')}
            </button>
          </div>
          <div className="space-y-2">
            {allowances.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" placeholder={t('salaryStructure.itemLabel')}
                  value={a.label} onChange={(e) => updateAllowance(i, 'label', e.target.value)} />
                <input className="input w-32" type="number" min="0" step="0.01" placeholder="0"
                  value={a.amount} onChange={(e) => updateAllowance(i, 'amount', e.target.value)} />
                <button type="button" className="icon-btn text-rose-600" onClick={() => removeAllowance(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!allowances.length ? <p className="text-xs text-slate-400">{t('salaryStructure.noAllowances')}</p> : null}
          </div>
        </div>

        {/* Deductions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label mb-0">{t('salaryStructure.deductions')}</p>
            <button type="button" className="btn-secondary h-7 gap-1 px-2 text-xs" onClick={addDeduction}>
              <Plus size={12} /> {t('common.add')}
            </button>
          </div>
          <div className="space-y-2">
            {deductions.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" placeholder={t('salaryStructure.itemLabel')}
                  value={d.label} onChange={(e) => updateDeduction(i, 'label', e.target.value)} />
                <input className="input w-32" type="number" min="0" step="0.01" placeholder="0"
                  value={d.amount} onChange={(e) => updateDeduction(i, 'amount', e.target.value)} />
                <button type="button" className="icon-btn text-rose-600" onClick={() => removeDeduction(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!deductions.length ? <p className="text-xs text-slate-400">{t('salaryStructure.noDeductions')}</p> : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
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
