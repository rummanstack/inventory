import { useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../../components/ui.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';

const SUPPLIER_SCOPES = ['ALL', 'SPECIFIC'];
const TARGET_TYPES = ['ALL', 'PRODUCT', 'CATEGORY'];
const BUY_UNITS = ['PIECE', 'CASE'];
const REWARD_TYPES = ['FREE_QUANTITY', 'FIXED_AMOUNT', 'PERCENTAGE'];
const SETTLEMENT_METHODS = ['MULTIPLE', 'CASH', 'STOCK', 'CREDIT_NOTE'];

function emptyForm(rule) {
  return {
    name: rule?.name || '',
    remarks: rule?.remarks || '',
    supplierScope: rule?.supplierScope || 'SPECIFIC',
    supplierId: rule?.supplierId || '',
    targetType: rule?.targetType || 'PRODUCT',
    targetId: rule?.targetId || '',
    buyUnit: rule?.buyUnit || 'PIECE',
    buyQuantity: rule?.buyQuantity != null ? rule.buyQuantity : '',
    rewardType: rule?.rewardType || 'FREE_QUANTITY',
    rewardUnit: rule?.rewardUnit || 'PIECE',
    rewardQuantity: rule?.rewardQuantity != null ? rule.rewardQuantity : '',
    rewardAmount: rule?.rewardAmount != null ? rule.rewardAmount : '',
    rewardPercentage: rule?.rewardPercentage != null ? rule.rewardPercentage : '',
    settlementMethod: rule?.settlementMethod || 'MULTIPLE',
    effectiveFrom: rule?.effectiveFrom || '',
    effectiveTo: rule?.effectiveTo || '',
    active: rule?.active !== false,
    priority: rule?.priority != null ? rule.priority : 100,
  };
}

export default function TradePromotionRuleFormModal({ rule, categories, onClose, onSave }) {
  const { t, supplierDirectory, productDirectory } = useInventoryApp();
  const formRef = useRef(null);
  const [form, setForm] = useState(emptyForm(rule));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(emptyForm(rule));
  }, [rule]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function targetOptions() {
    if (form.targetType === 'PRODUCT') return productDirectory.map((p) => ({ id: p.id, name: p.name }));
    if (form.targetType === 'CATEGORY') return categories;
    return [];
  }

  const caseUnitBlocked = form.targetType !== 'PRODUCT' && (form.buyUnit === 'CASE' || form.rewardUnit === 'CASE');

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError(t('tradePromotions.rules.validation.nameRequired'));
      return;
    }
    if (form.supplierScope === 'SPECIFIC' && !form.supplierId) {
      setError(t('tradePromotions.rules.validation.supplierRequired'));
      return;
    }
    if ((form.targetType === 'PRODUCT' || form.targetType === 'CATEGORY') && !form.targetId) {
      setError(t('tradePromotions.rules.validation.targetRequired'));
      return;
    }
    if (caseUnitBlocked) {
      setError(t('tradePromotions.rules.validation.caseUnitBlocked'));
      return;
    }
    const buyQuantity = Number(form.buyQuantity || 0);
    if (buyQuantity <= 0) {
      setError(t('tradePromotions.rules.validation.buyQuantityRequired'));
      return;
    }
    if (form.rewardType === 'FREE_QUANTITY' && Number(form.rewardQuantity || 0) <= 0) {
      setError(t('tradePromotions.rules.validation.rewardQuantityRequired'));
      return;
    }
    if (form.rewardType === 'FIXED_AMOUNT' && Number(form.rewardAmount || 0) <= 0) {
      setError(t('tradePromotions.rules.validation.rewardAmountRequired'));
      return;
    }
    if (form.rewardType === 'PERCENTAGE') {
      const pct = Number(form.rewardPercentage || 0);
      if (pct <= 0 || pct > 100) {
        setError(t('tradePromotions.rules.validation.rewardPercentageRequired'));
        return;
      }
    }

    setSaving(true);
    const payload = {
      id: rule?.id,
      name: form.name.trim(),
      remarks: form.remarks.trim(),
      supplierScope: form.supplierScope,
      supplierId: form.supplierScope === 'ALL' ? null : form.supplierId,
      targetType: form.targetType,
      targetId: form.targetType === 'ALL' ? null : form.targetId,
      buyUnit: form.buyUnit,
      buyQuantity,
      rewardType: form.rewardType,
      rewardUnit: form.rewardType === 'FREE_QUANTITY' ? form.rewardUnit : null,
      rewardQuantity: form.rewardType === 'FREE_QUANTITY' ? Number(form.rewardQuantity || 0) : 0,
      rewardAmount: form.rewardType === 'FIXED_AMOUNT' ? Number(form.rewardAmount || 0) : 0,
      rewardPercentage: form.rewardType === 'PERCENTAGE' ? Number(form.rewardPercentage || 0) : 0,
      settlementMethod: form.settlementMethod,
      effectiveFrom: form.effectiveFrom || null,
      effectiveTo: form.effectiveTo || null,
      active: Boolean(form.active),
      priority: Number(form.priority || 100),
    };

    const result = await onSave(payload);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('tradePromotions.rules.saveFailed'));
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
    <Modal title={rule ? t('tradePromotions.rules.editTitle') : t('tradePromotions.rules.addTitle')} description={t('tradePromotions.rules.modalDescription')} onClose={onClose} width="max-w-4xl">
      <form ref={formRef} className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('tradePromotions.rules.name')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('tradePromotions.rules.priority')}</label>
            <input className="input" type="number" inputMode="numeric" min="1" step="1" value={form.priority} onChange={(event) => updateField('priority', event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('tradePromotions.rules.remarks')}</label>
            <textarea className="input min-h-20" value={form.remarks} onChange={(event) => updateField('remarks', event.target.value)} />
          </div>

          <div>
            <label className="label">{t('tradePromotions.rules.supplierScope')}</label>
            <Select className="input" value={form.supplierScope} onChange={(event) => updateField('supplierScope', event.target.value)}>
              {SUPPLIER_SCOPES.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.rules.supplierScopes.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('tradePromotions.rules.supplier')}</label>
            <Select className="input" value={form.supplierId} onChange={(event) => updateField('supplierId', event.target.value)} disabled={form.supplierScope === 'ALL'}>
              <option value="">{t('tradePromotions.rules.selectSupplier')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="label">{t('tradePromotions.rules.targetType')}</label>
            <Select className="input" value={form.targetType} onChange={(event) => updateField('targetType', event.target.value)}>
              {TARGET_TYPES.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.rules.targetTypes.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('tradePromotions.rules.target')}</label>
            <Select className="input" value={form.targetId} onChange={(event) => updateField('targetId', event.target.value)} disabled={form.targetType === 'ALL'}>
              <option value="">{t('tradePromotions.rules.selectTarget')}</option>
              {targetOptions().map((target) => (
                <option key={target.id} value={target.id}>{target.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="label">{t('tradePromotions.rules.buyUnit')}</label>
            <Select className="input" value={form.buyUnit} onChange={(event) => updateField('buyUnit', event.target.value)}>
              {BUY_UNITS.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.rules.units.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('tradePromotions.rules.buyQuantity')}</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.buyQuantity} onChange={(event) => updateField('buyQuantity', event.target.value)} />
          </div>

          <div>
            <label className="label">{t('tradePromotions.rules.rewardType')}</label>
            <Select className="input" value={form.rewardType} onChange={(event) => updateField('rewardType', event.target.value)}>
              {REWARD_TYPES.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.rules.rewardTypes.${value}`)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('tradePromotions.rules.settlementMethod')}</label>
            <Select className="input" value={form.settlementMethod} onChange={(event) => updateField('settlementMethod', event.target.value)}>
              {SETTLEMENT_METHODS.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.settlements.methods.${value}`)}</option>
              ))}
            </Select>
          </div>

          {form.rewardType === 'FREE_QUANTITY' ? (
            <>
              <div>
                <label className="label">{t('tradePromotions.rules.rewardUnit')}</label>
                <Select className="input" value={form.rewardUnit} onChange={(event) => updateField('rewardUnit', event.target.value)}>
                  {BUY_UNITS.map((value) => (
                    <option key={value} value={value}>{t(`tradePromotions.rules.units.${value}`)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="label">{t('tradePromotions.rules.rewardQuantity')}</label>
                <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.rewardQuantity} onChange={(event) => updateField('rewardQuantity', event.target.value)} />
              </div>
            </>
          ) : null}
          {form.rewardType === 'FIXED_AMOUNT' ? (
            <div>
              <label className="label">{t('tradePromotions.rules.rewardAmount')}</label>
              <input className="input" type="number" inputMode="decimal" min="0" step="0.01" value={form.rewardAmount} onChange={(event) => updateField('rewardAmount', event.target.value)} />
            </div>
          ) : null}
          {form.rewardType === 'PERCENTAGE' ? (
            <div>
              <label className="label">{t('tradePromotions.rules.rewardPercentage')}</label>
              <input className="input" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={form.rewardPercentage} onChange={(event) => updateField('rewardPercentage', event.target.value)} />
            </div>
          ) : null}

          <div>
            <label className="label">{t('tradePromotions.rules.effectiveFrom')}</label>
            <DatePickerField value={form.effectiveFrom} onChange={(value) => updateField('effectiveFrom', value)} />
          </div>
          <div>
            <label className="label">{t('tradePromotions.rules.effectiveTo')}</label>
            <DatePickerField value={form.effectiveTo} onChange={(value) => updateField('effectiveTo', value)} min={form.effectiveFrom} />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                type="checkbox"
                checked={Boolean(form.active)}
                onChange={(event) => updateField('active', event.target.checked)}
              />
              <span>
                <span className="block font-semibold text-slate-950">{t('tradePromotions.rules.active')}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">{t('tradePromotions.rules.activeHint')}</span>
              </span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('common.save')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Ctrl+S</kbd>
          </button>
        </div>
      </form>
    </Modal>
  );
}
