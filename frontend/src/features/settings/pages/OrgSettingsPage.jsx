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
            {t('orgSettings.taxHelp') || 'Set this to 0 to hide tax from cashier screens.'}
          </p>
        </label>

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
