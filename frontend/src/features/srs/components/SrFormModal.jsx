import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../components/ui.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function SrFormModal({ sr, onClose, onSave }) {
  const isEdit = Boolean(sr);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: sr?.name || '',
    phone: sr?.phone || '',
    status: sr?.status || 'Active',
    openingDue: sr?.openingDue || 0,
  });
  const [reason, setReason] = useState('');
  const openingDueChanged = isEdit && Math.max(0, Number(form.openingDue || 0)) !== Number(sr?.openingDue || 0);

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }

    if (openingDueChanged && !reason.trim()) {
      setError('Reason is required when changing opening due.');
      return;
    }

    if (isEdit) {
      const unchanged =
        form.name.trim() === sr.name &&
        form.phone.trim() === sr.phone &&
        form.status === sr.status &&
        !openingDueChanged;
      if (unchanged) {
        onClose();
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: sr?.id,
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      openingDue: Math.max(0, Number(form.openingDue || 0)),
      reason: reason.trim(),
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || 'Failed to save SR.');
    }
  }

  return (
    <Modal title={isEdit ? 'Edit SR' : 'Add SR'} description="Sales Representative details" onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Enter SR name" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Enter phone number" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Opening Due</label>
            <input className="input" type="number" min="0" step="0.01" value={form.openingDue} onChange={(e) => updateField('openingDue', e.target.value)} placeholder="0.00" />
          </div>
          {openingDueChanged ? (
            <div className="sm:col-span-2">
              <label className="label">Reason for Due Adjustment</label>
              <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why the opening due is being changed" />
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save SR'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
