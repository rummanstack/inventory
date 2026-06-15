import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function TenantEditModal({ tenant, onClose, onSave }) {
  const { t } = useInventoryApp();
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: tenant.name || '',
    email: tenant.email || '',
    plan: tenant.plan || 'starter',
    address: tenant.address || '',
    logoUrl: tenant.logoUrl || '',
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err?.message || t('organizations.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('organizations.editTitle')} description={tenant.name} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <label className="block">
          <span className="label">{t('organizations.name')}</span>
          <input className="input" type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.email')}</span>
          <input className="input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.plan')}</span>
          <select className="input" value={form.plan} onChange={(e) => updateField('plan', e.target.value)}>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t('orgSettings.logoUrl')}</span>
          <input className="input" type="text" value={form.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" />
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="" className="mt-3 h-12 w-12 rounded-lg border border-slate-200 object-contain p-1" />
          ) : null}
        </label>
        <label className="block">
          <span className="label">{t('organizations.address')}</span>
          <textarea className="input min-h-[80px] resize-y" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
