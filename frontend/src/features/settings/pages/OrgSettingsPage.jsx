import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Alert, SectionHeader } from '../../../components/ui.jsx';
import PhotoUploadField from '../../../components/PhotoUploadField.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

export default function OrgSettingsPage() {
  const { tenant, user, t, setTenant, pushToast } = useInventoryApp();
  const [form, setForm] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    address: tenant?.address || '',
    logoUrl: tenant?.logoUrl || '',
    taxRate: String(Number(tenant?.taxRate || 0)),
    loyaltyEnabled: Boolean(tenant?.loyaltyEnabled),
    loyaltyPointsPer100: String(Number(tenant?.loyaltyPointsPer100 ?? 1)),
    loyaltyPointValue: String(Number(tenant?.loyaltyPointValue ?? 1)),
    businessType: tenant?.businessType || 'ELECTRONICS',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenant) return;
    setForm({
      name: tenant.name || '',
      email: tenant.email || '',
      address: tenant.address || '',
      logoUrl: tenant.logoUrl || '',
      taxRate: String(Number(tenant.taxRate || 0)),
      loyaltyEnabled: Boolean(tenant.loyaltyEnabled),
      loyaltyPointsPer100: String(Number(tenant.loyaltyPointsPer100 ?? 1)),
      loyaltyPointValue: String(Number(tenant.loyaltyPointValue ?? 1)),
      businessType: tenant.businessType || 'ELECTRONICS',
    });
  }, [tenant]);

  if (!tenant) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await inventoryApi.updateOrgSettings(form);
      if (result?.tenant) {
        setTenant((current) => (current ? { ...current, ...result.tenant } : result.tenant));
      }
      pushToast('success', t('orgSettings.title'), t('orgSettings.saveSuccess'));
    } catch (err) {
      const message = err?.message || t('orgSettings.saveFailed');
      setError(message);
      pushToast('error', t('alerts.requestFailed'), message);
    } finally {
      setSaving(false);
    }
  }

  const canEdit = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t('orgSettings.eyebrow')} title={t('orgSettings.title')} description={t('orgSettings.description', { name: tenant.name })} />
      <form onSubmit={handleSubmit} className="panel-strong max-w-xl space-y-5 p-6">
        {error ? <Alert type="error">{error}</Alert> : null}

        <label className="block">
          <span className="label">{t('orgSettings.name')}</span>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={!canEdit}
            required
          />
        </label>

        <label className="block">
          <span className="label">{t('orgSettings.email')}</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={!canEdit}
            required
          />
        </label>

        <label className="block">
          <span className="label">{t('orgSettings.businessType')}</span>
          <select
            className="input"
            value={form.businessType}
            onChange={(e) => handleChange('businessType', e.target.value)}
            disabled={!canEdit}
          >
            <option value="ELECTRONICS">{t('orgSettings.businessTypeElectronics')}</option>
            <option value="GROCERY">{t('orgSettings.businessTypeGrocery')}</option>
            <option value="DRUG_PHARMACY">{t('orgSettings.businessTypeDrugPharmacy')}</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">{t('orgSettings.businessTypeHelp')}</p>
        </label>

        <PhotoUploadField
          label={t('orgSettings.logoUrl')}
          value={form.logoUrl}
          onChange={(url) => handleChange('logoUrl', url)}
          shape="square"
          disabled={!canEdit}
        />

        <label className="block">
          <span className="label">{t('orgSettings.address')}</span>
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <label className="block">
          <span className="label">{t('retailer.shared.taxRateLabel')}</span>
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.taxRate}
            onChange={(e) => handleChange('taxRate', e.target.value)}
            disabled={!canEdit}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('orgSettings.taxHelp') || 'This is the company default. Individual products can override it.'}
          </p>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <label className="flex items-start gap-3">
            <input
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              type="checkbox"
              checked={Boolean(form.loyaltyEnabled)}
              onChange={(e) => handleChange('loyaltyEnabled', e.target.checked)}
              disabled={!canEdit}
            />
            <span>
              <span className="block font-semibold text-slate-950">{t('orgSettings.loyaltyEnabled')}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {t('orgSettings.loyaltyEnabledHelp') || 'When enabled, customers can earn loyalty points on sales.'}
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t('orgSettings.loyaltyPointsPer100')}</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.loyaltyPointsPer100}
                onChange={(e) => handleChange('loyaltyPointsPer100', e.target.value)}
                disabled={!canEdit || !form.loyaltyEnabled}
              />
            </label>
            <label className="block">
              <span className="label">{t('orgSettings.loyaltyPointValue')}</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.loyaltyPointValue}
                onChange={(e) => handleChange('loyaltyPointValue', e.target.value)}
                disabled={!canEdit || !form.loyaltyEnabled}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <p className="flex-1 text-xs text-slate-500">
            {t('orgSettings.orgCode')}: <span className="font-mono font-bold text-slate-700">{tenant.slug}</span>
            {' · '}
            {t('orgSettings.plan')}: <span className="font-bold text-slate-700">{tenant.plan}</span>
          </p>
          {canEdit ? (
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? t('common.saving') : t('common.save')}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
