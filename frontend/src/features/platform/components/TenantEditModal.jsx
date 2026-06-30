import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import PhotoUploadField from '../../../components/PhotoUploadField.jsx';
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
    businessType: tenant.businessType || 'ELECTRONICS',
    sellerType: tenant.sellerType || 'DEALER',
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
            <option value="starter">{t('organizations.planStarter')}</option>
            <option value="pro">{t('organizations.planPro')}</option>
            <option value="enterprise">{t('organizations.planEnterprise')}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t('organizations.businessType')}</span>
          <select className="input" value={form.businessType} onChange={(e) => updateField('businessType', e.target.value)}>
            <option value="ELECTRONICS">{t('organizations.businessTypeElectronics')}</option>
            <option value="GROCERY">{t('organizations.businessTypeGrocery')}</option>
            <option value="DRUG_PHARMACY">{t('organizations.businessTypeDrugPharmacy')}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t('organizations.sellerType')}</span>
          <select className="input" value={form.sellerType} onChange={(e) => updateField('sellerType', e.target.value)}>
            <option value="DEALER">{t('organizations.sellerTypeDealer')}</option>
            <option value="RETAILER">{t('organizations.sellerTypeRetailer')}</option>
          </select>
        </label>
        <PhotoUploadField label={t('orgSettings.logoUrl')} value={form.logoUrl} onChange={(url) => updateField('logoUrl', url)} shape="square" />
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
