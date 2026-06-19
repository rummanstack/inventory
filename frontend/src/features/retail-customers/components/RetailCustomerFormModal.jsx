import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function RetailCustomerFormModal({ retailCustomer, onClose, onSave }) {
  const { t, pushToast } = useInventoryApp();
  const isEdit = Boolean(retailCustomer);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: retailCustomer?.name || '',
    phone: retailCustomer?.phone || '',
    address: retailCustomer?.address || '',
    note: retailCustomer?.note || '',
    status: retailCustomer?.status || 'ACTIVE',
  });

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t('retailCustomers.required'));
      return;
    }

    const payload = {
      id: retailCustomer?.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
      status: form.status,
    };

    if (isEdit) {
      const unchanged =
        payload.name === retailCustomer.name &&
        payload.phone === retailCustomer.phone &&
        payload.address === retailCustomer.address &&
        payload.note === (retailCustomer.note || '') &&
        payload.status === retailCustomer.status;
      if (unchanged) {
        pushToast('info', t('retailCustomers.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('retailCustomers.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('retailCustomers.editTitle') : t('retailCustomers.addTitle')} description={t('retailCustomers.modalDescription')} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('retailCustomers.nameLabel')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder={t('retailCustomers.nameLabel')} />
          </div>
          <div>
            <label className="label">{t('retailCustomers.phoneLabel')}</label>
            <input className="input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder={t('retailCustomers.phoneLabel')} />
          </div>
          <div>
            <label className="label">{t('retailCustomers.status')}</label>
            <select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="ACTIVE">{t('retailCustomers.statusActive')}</option>
              <option value="INACTIVE">{t('retailCustomers.statusInactive')}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('retailCustomers.addressLabel')}</label>
            <input className="input" value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder={t('retailCustomers.addressLabel')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('retailCustomers.noteLabel')}</label>
            <textarea className="input min-h-28" value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('retailCustomers.noteLabel')} />
          </div>
        </div>
        {isEdit ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('retailCustomers.loyaltyPoints')}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{Number(retailCustomer.loyaltyPointsBalance || 0)}</p>
          </div>
        ) : null}
        {isEdit ? <AuditHistory entityType="retail_customer" entityId={retailCustomer.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('retailCustomers.saveCustomer')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
