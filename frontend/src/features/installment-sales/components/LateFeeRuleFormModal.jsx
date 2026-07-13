import { useEffect, useState } from 'react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

const FEE_TYPES = ['FIXED', 'PERCENT', 'DAILY', 'WEEKLY', 'MONTHLY'];

function emptyForm(rule) {
  return {
    feeType: rule?.feeType || 'FIXED',
    feeValue: rule?.feeValue != null ? rule.feeValue : '',
    gracePeriodDays: rule?.gracePeriodDays != null ? rule.gracePeriodDays : 0,
    maxPenaltyAmount: rule?.maxPenaltyAmount != null ? rule.maxPenaltyAmount : '',
    active: rule?.active !== false,
  };
}

export default function LateFeeRuleFormModal({ rule, onClose, onSave }) {
  const { t } = useInventoryApp();
  const [form, setForm] = useState(emptyForm(rule));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(emptyForm(rule));
  }, [rule]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (Number(form.feeValue) < 0) {
      setError(t('installments.lateFeeRules.validation.feeValueRequired'));
      return;
    }

    setSaving(true);
    const payload = {
      id: rule?.id,
      feeType: form.feeType,
      feeValue: Number(form.feeValue || 0),
      gracePeriodDays: Math.max(0, Number(form.gracePeriodDays || 0)),
      maxPenaltyAmount: Math.max(0, Number(form.maxPenaltyAmount || 0)),
      active: Boolean(form.active),
    };
    const result = await onSave(payload);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('installments.lateFeeRules.saveFailed'));
    }
  }

  return (
    <Modal title={rule ? t('installments.lateFeeRules.editTitle') : t('installments.lateFeeRules.addTitle')} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('installments.lateFeeRules.feeType')}</label>
            <Select className="input" value={form.feeType} onChange={(event) => updateField('feeType', event.target.value)}>
              {FEE_TYPES.map((value) => (
                <option key={value} value={value}>{t(`installments.lateFeeRules.feeTypes.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('installments.lateFeeRules.feeValue')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.feeValue} onChange={(event) => updateField('feeValue', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.lateFeeRules.gracePeriodDays')}</label>
            <input className="input" type="number" min="0" step="1" value={form.gracePeriodDays} onChange={(event) => updateField('gracePeriodDays', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.lateFeeRules.maxPenaltyAmount')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.maxPenaltyAmount} onChange={(event) => updateField('maxPenaltyAmount', event.target.value)} placeholder="0" />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                type="checkbox"
                checked={Boolean(form.active)}
                onChange={(event) => updateField('active', event.target.checked)}
              />
              <span className="text-sm font-semibold text-slate-950">{t('installments.lateFeeRules.active')}</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}
