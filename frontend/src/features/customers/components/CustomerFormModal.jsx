import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function CustomerFormModal({ customer, onClose, onSave }) {
  const { t, dsrDirectory, pushToast } = useInventoryApp();
  const isEdit = Boolean(customer);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    shopName: customer?.shopName || '',
    ownerName: customer?.ownerName || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    market: customer?.market || '',
    assignedDsrId: customer?.assignedDsrId || '',
    openingDue: customer?.openingDue ?? 0,
    currentDue: customer?.currentDue ?? 0,
    status: customer?.status || 'ACTIVE',
    note: customer?.note || '',
  });

  async function submitForm(event) {
    event.preventDefault();
    if (!form.shopName.trim()) {
      setError(t('customers.required'));
      return;
    }

    const payload = {
      id: customer?.id,
      shopName: form.shopName.trim(),
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      market: form.market.trim(),
      assignedDsrId: form.assignedDsrId || null,
      openingDue: Math.max(0, Number(form.openingDue || 0)),
      status: form.status,
      note: form.note.trim(),
    };
    if (isEdit) {
      payload.currentDue = Math.max(0, Number(form.currentDue || 0));

      const unchanged =
        payload.shopName === customer.shopName &&
        payload.ownerName === customer.ownerName &&
        payload.phone === customer.phone &&
        payload.address === customer.address &&
        payload.market === customer.market &&
        payload.assignedDsrId === (customer.assignedDsrId || null) &&
        payload.openingDue === Number(customer.openingDue ?? 0) &&
        payload.currentDue === Number(customer.currentDue ?? 0) &&
        payload.status === customer.status &&
        payload.note === (customer.note || '');
      if (unchanged) {
        pushToast('info', t('customers.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('customers.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('customers.editTitle') : t('customers.addTitle')} description={t('customers.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('customers.shopNameLabel')}</label>
            <input className="input" value={form.shopName} onChange={(event) => updateField('shopName', event.target.value)} placeholder={t('customers.shopNameLabel')} />
          </div>
          <div>
            <label className="label">{t('customers.ownerNameLabel')}</label>
            <input className="input" value={form.ownerName} onChange={(event) => updateField('ownerName', event.target.value)} placeholder={t('customers.ownerNameLabel')} />
          </div>
          <div>
            <label className="label">{t('customers.phoneLabel')}</label>
            <input className="input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder={t('customers.phoneLabel')} />
          </div>
          <div>
            <label className="label">{t('customers.marketLabel')}</label>
            <input className="input" value={form.market} onChange={(event) => updateField('market', event.target.value)} placeholder={t('customers.marketLabel')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('customers.addressLabel')}</label>
            <input className="input" value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder={t('customers.addressLabel')} />
          </div>
          <div>
            <label className="label">{t('customers.assignedDsrLabel')}</label>
            <select className="input" value={form.assignedDsrId} onChange={(event) => updateField('assignedDsrId', event.target.value)}>
              <option value="">{t('customers.unassigned')}</option>
              {dsrDirectory.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>{dsr.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('customers.status')}</label>
            <select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="ACTIVE">{t('customers.statusActive')}</option>
              <option value="INACTIVE">{t('customers.statusInactive')}</option>
            </select>
          </div>
          <div>
            <label className="label">{t('customers.openingDueLabel')}</label>
            <input className="input" type="number" min="0" step="0.01" value={form.openingDue} onChange={(event) => updateField('openingDue', event.target.value)} placeholder="0.00" />
          </div>
          {isEdit ? (
            <div>
              <label className="label">{t('customers.currentDueLabel')}</label>
              <input className="input" type="number" min="0" step="0.01" value={form.currentDue} onChange={(event) => updateField('currentDue', event.target.value)} placeholder="0.00" />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="label">{t('customers.noteLabel')}</label>
            <textarea className="input" rows={3} value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('customers.noteLabel')} />
          </div>
        </div>
        {isEdit ? <AuditHistory entityType="customer" entityId={customer.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('customers.saveCustomer')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
