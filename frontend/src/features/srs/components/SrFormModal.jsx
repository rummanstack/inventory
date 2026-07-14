import { useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../hooks/useFormState';

export default function SrFormModal({ sr, onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(sr);
  const formRef = useRef(null);
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
      setError(t('srs.required'));
      return;
    }

    if (openingDueChanged && !reason.trim()) {
      setError(t('srs.reasonRequired'));
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
      setError(result?.message || t('srs.saveFailed'));
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey) && !saving) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saving]);

  return (
    <Modal title={isEdit ? t('srs.editTitle') : t('srs.addTitle')} description={t('srs.modalDescription')} onClose={onClose} width="max-w-lg">
      <form ref={formRef} className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('srs.nameLabel')}</label>
            <input className="input" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('srs.namePlaceholder')} />
          </div>
          <div>
            <label className="label">{t('srs.phoneLabel')}</label>
            <input className="input" type="tel" inputMode="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder={t('srs.phonePlaceholder')} />
          </div>
          <div>
            <label className="label">{t('srs.statusLabel')}</label>
            <Select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="Active">{t('srs.statusActive')}</option>
              <option value="Inactive">{t('srs.statusInactive')}</option>
            </Select>
          </div>
          <div>
            <label className="label">{t('srs.openingDueLabel')}</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.openingDue} onChange={(e) => updateField('openingDue', e.target.value)} placeholder="0.00" />
          </div>
          {openingDueChanged ? (
            <div className="sm:col-span-2">
              <label className="label">{t('common.dueAdjustmentReasonLabel')}</label>
              <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('common.editReasonPlaceholder')} />
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('srs.saveSr')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Ctrl+S</kbd>
          </button>
        </div>
      </form>
    </Modal>
  );
}

