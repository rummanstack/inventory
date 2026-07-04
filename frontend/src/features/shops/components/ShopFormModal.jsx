import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import AuditHistory from '../../../components/AuditHistory.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function ShopFormModal({ shop, onClose, onSave }) {
  const { t, dsrDirectory, pushToast } = useInventoryApp();
  const isEdit = Boolean(shop);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    shopName: shop?.shopName || '',
    ownerName: shop?.ownerName || '',
    phone: shop?.phone || '',
    address: shop?.address || '',
    market: shop?.market || '',
    assignedDsrId: shop?.assignedDsrId || '',
    openingDue: shop?.openingDue ?? 0,
    currentDue: shop?.currentDue ?? 0,
    status: shop?.status || 'ACTIVE',
    note: shop?.note || '',
  });

  async function submitForm(event) {
    event.preventDefault();
    if (!form.shopName.trim()) {
      setError(t('shops.required'));
      return;
    }

    const payload = {
      id: shop?.id,
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
        payload.shopName === shop.shopName &&
        payload.ownerName === shop.ownerName &&
        payload.phone === shop.phone &&
        payload.address === shop.address &&
        payload.market === shop.market &&
        payload.assignedDsrId === (shop.assignedDsrId || null) &&
        payload.openingDue === Number(shop.openingDue ?? 0) &&
        payload.currentDue === Number(shop.currentDue ?? 0) &&
        payload.status === shop.status &&
        payload.note === (shop.note || '');
      if (unchanged) {
        pushToast('info', t('shops.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave(payload);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('shops.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('shops.editTitle') : t('shops.addTitle')} description={t('shops.modalDescription')} onClose={onClose} width="max-w-2xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('shops.shopNameLabel')}</label>
            <input className="input" value={form.shopName} onChange={(event) => updateField('shopName', event.target.value)} placeholder={t('shops.shopNameLabel')} />
          </div>
          <div>
            <label className="label">{t('shops.ownerNameLabel')}</label>
            <input className="input" value={form.ownerName} onChange={(event) => updateField('ownerName', event.target.value)} placeholder={t('shops.ownerNameLabel')} />
          </div>
          <div>
            <label className="label">{t('shops.phoneLabel')}</label>
            <input className="input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder={t('shops.phoneLabel')} />
          </div>
          <div>
            <label className="label">{t('shops.marketLabel')}</label>
            <input className="input" value={form.market} onChange={(event) => updateField('market', event.target.value)} placeholder={t('shops.marketLabel')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('shops.addressLabel')}</label>
            <input className="input" value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder={t('shops.addressLabel')} />
          </div>
          <div>
            <label className="label">{t('shops.assignedDsrLabel')}</label>
            <Select className="input" value={form.assignedDsrId} onChange={(event) => updateField('assignedDsrId', event.target.value)}>
              <option value="">{t('shops.unassigned')}</option>
              {dsrDirectory.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>{dsr.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('shops.status')}</label>
            <Select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="ACTIVE">{t('shops.statusActive')}</option>
              <option value="INACTIVE">{t('shops.statusInactive')}</option>
            </Select>
          </div>
          <div>
            <label className="label">{t('shops.openingDueLabel')}</label>
            <input className="input" type="number" min="0" step="0.0001" value={form.openingDue} onChange={(event) => updateField('openingDue', event.target.value)} placeholder="0.00" />
          </div>
          {isEdit ? (
            <div>
              <label className="label">{t('shops.currentDueLabel')}</label>
              <input className="input" type="number" min="0" step="0.0001" value={form.currentDue} onChange={(event) => updateField('currentDue', event.target.value)} placeholder="0.00" />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <label className="label">{t('shops.noteLabel')}</label>
            <textarea className="input" rows={3} value={form.note} onChange={(event) => updateField('note', event.target.value)} placeholder={t('shops.noteLabel')} />
          </div>
        </div>
        {isEdit ? <AuditHistory entityType="customer" entityId={shop.id} /> : null}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('shops.saveShop')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

