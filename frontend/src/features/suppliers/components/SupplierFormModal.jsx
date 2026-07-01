import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function SupplierFormModal({ supplier, onClose, onSave }) {
  const { t, pushToast } = useInventoryApp();
  const isEdit = Boolean(supplier);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    openingDue: supplier?.openingDue ?? 0,
    currentDue: supplier?.currentDue ?? 0,
    status: supplier?.status || 'ACTIVE',
    note: supplier?.note || '',
  });

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t('suppliers.required'));
      return;
    }

    const payload = {
      id: supplier?.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      openingDue: Math.max(0, Number(form.openingDue || 0)),
      status: form.status,
      note: form.note.trim(),
    };
    if (isEdit) {
      payload.currentDue = Math.max(0, Number(form.currentDue || 0));

      const unchanged =
        payload.name === supplier.name &&
        payload.phone === supplier.phone &&
        payload.address === supplier.address &&
        payload.openingDue === Number(supplier.openingDue ?? 0) &&
        payload.currentDue === Number(supplier.currentDue ?? 0) &&
        payload.status === supplier.status &&
        payload.note === (supplier.note || '');
      if (unchanged) {
        pushToast('info', t('suppliers.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('suppliers.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('suppliers.editTitle') : t('suppliers.addTitle')} description={t('suppliers.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('suppliers.nameLabel')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder={t('suppliers.nameLabel')} />
          </div>
          <div>
            <label className="label">{t('suppliers.phoneLabel')}</label>
            <input className="input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder={t('suppliers.phoneLabel')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('suppliers.addressLabel')}</label>
            <input className="input" value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder={t('suppliers.addressLabel')} />
          </div>
          <div>
            <label className="label">{t('suppliers.status')}</label>
            <Select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="ACTIVE">{t('suppliers.statusActive')}</option>
              <option value="INACTIVE">{t('suppliers.statusInactive')}</option>
            </Select>
          </div>
          <div>
            <label className="label">{t('suppliers.openingDueLabel')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.openingDue} onChange={(event) => updateField('openingDue', event.target.value)} placeholder="0.00" />
          </div>
          {isEdit ? (
            <div>
              <label className="label">{t('suppliers.currentDueLabel')}</label>
              <input className="input" type="number" min="0" step="0.01" value={form.currentDue} onChange={(event) => updateField('currentDue', event.target.value)} placeholder="0.00" />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="label">{t('suppliers.noteLabel')}</label>
            <textarea className="input" rows={3} value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('suppliers.noteLabel')} />
          </div>
        </div>
        {isEdit ? <AuditHistory entityType="supplier" entityId={supplier.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('suppliers.saveSupplier')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

