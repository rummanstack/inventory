import { useState } from 'react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

export default function GuarantorFormModal({ onClose, onSave }) {
  const { t } = useInventoryApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('installments.guarantors.validation.nameRequired'));
      return;
    }

    setSaving(true);
    const result = await onSave({
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim(),
      address: address.trim(),
      nationalId: nationalId.trim(),
      occupation: occupation.trim(),
      monthlyIncome: Number(monthlyIncome || 0),
    });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('installments.guarantors.saveFailed'));
    }
  }

  return (
    <Modal title={t('installments.guarantors.add')} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('installments.guarantors.name')}</label>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.guarantors.phone')}</label>
            <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.guarantors.relationship')}</label>
            <input className="input" value={relationship} onChange={(event) => setRelationship(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.guarantors.nationalId')}</label>
            <input className="input" value={nationalId} onChange={(event) => setNationalId(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.guarantors.occupation')}</label>
            <input className="input" value={occupation} onChange={(event) => setOccupation(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('installments.guarantors.monthlyIncome')}</label>
            <input className="input" type="number" min="0" step="0.01" value={monthlyIncome} onChange={(event) => setMonthlyIncome(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('installments.guarantors.address')}</label>
            <textarea className="input min-h-16" value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}
