import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../../hooks/useFormState.js';

export default function DesignationFormModal({ designation, onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(designation);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: designation?.name || '',
    code: designation?.code || '',
    status: designation?.status || 'ACTIVE',
    note: designation?.note || '',
  });

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t('designations.nameRequired'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: designation?.id,
      name: form.name.trim(),
      code: form.code.trim(),
      status: form.status,
      note: form.note.trim(),
    });
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Modal
      title={isEdit ? t('designations.editTitle') : t('designations.addTitle')}
      description={t('designations.modalDescription')}
      onClose={onClose}
      width="max-w-xl"
    >
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('designations.name')} *</label>
            <input className="input" value={form.name} onChange={(e) => updateField('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">{t('designations.code')}</label>
            <input className="input uppercase" value={form.code} onChange={(e) => updateField('code', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('designations.status')}</label>
            <Select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="ACTIVE">{t('designations.active')}</option>
              <option value="INACTIVE">{t('designations.inactive')}</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('designations.note')}</label>
            <textarea className="input" rows={2} value={form.note} onChange={(e) => updateField('note', e.target.value)} />
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
