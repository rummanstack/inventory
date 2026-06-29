import { Loader2, Plus } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function TenantCreateModal({ onClose, onSave }) {
  const { t } = useInventoryApp();
  const { form, updateField, error, setError, saving: creating, setSaving: setCreating } = useFormState({
    name: '',
    slug: '',
    email: '',
    plan: 'starter',
    businessType: 'ELECTRONICS',
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err?.message || t('organizations.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal title={t('organizations.createTitle')} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <label className="block">
          <span className="label">{t('organizations.name')}</span>
          <input className="input" type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.code')}</span>
          <input className="input font-mono" type="text" value={form.slug} onChange={(e) => updateField('slug', e.target.value.toLowerCase())} placeholder={t('organizations.codePlaceholder')} required />
        </label>
        <label className="block">
          <span className="label">{t('organizations.adminEmail')}</span>
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
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={creating}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {creating ? t('organizations.creating') : t('organizations.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
