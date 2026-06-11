import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

export default function DsrFormModal({ dsr, onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(dsr);
  const [form, setForm] = useState({
    name: dsr?.name || '',
    phone: dsr?.phone || '',
    area: dsr?.area || '',
    status: dsr?.status || 'Active',
    openingDue: dsr?.openingDue || 0,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.area.trim()) {
      setError(t('dsr.required'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({ id: dsr?.id, ...form, name: form.name.trim(), phone: form.phone.trim(), area: form.area.trim(), openingDue: Math.max(0, Number(form.openingDue || 0)) });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('dsr.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('dsr.editTitle') : t('dsr.addTitle')} description={t('dsr.modalDescription')} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('dsr.nameLabel')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Enter DSR name" />
          </div>
          <div>
            <label className="label">{t('dsr.phoneLabel')}</label>
            <input className="input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Enter phone number" />
          </div>
          <div>
            <label className="label">{t('dsr.areaLabel')}</label>
            <input className="input" value={form.area} onChange={(event) => updateField('area', event.target.value)} placeholder="Enter area" />
          </div>
          <div>
            <label className="label">{t('dsr.status')}</label>
            <select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="Active">{t('dsr.statusActive')}</option>
              <option value="Inactive">{t('dsr.statusInactive')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('dsr.openingDue')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.openingDue} onChange={(event) => updateField('openingDue', event.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('dsr.saveDsr')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
