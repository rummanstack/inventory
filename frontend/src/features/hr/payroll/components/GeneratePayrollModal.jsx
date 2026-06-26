import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../../hooks/useFormState';
import { inventoryApi } from '../../../../services/inventoryApi.js';

export default function GeneratePayrollModal({ onClose, onGenerated }) {
  const { t } = useInventoryApp();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    month: defaultMonth,
    notes: '',
  });

  async function submitForm(e) {
    e.preventDefault();
    if (!form.month) { setError(t('payroll.monthRequired')); return; }
    setSaving(true);
    setError('');
    try {
      await inventoryApi.generatePayroll({ month: form.month, notes: form.notes });
      onGenerated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={t('payroll.generate')} description={t('payroll.generateDescription')} onClose={onClose} width="max-w-md">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div>
          <label className="label">{t('payroll.month')} *</label>
          <input className="input" type="month" value={form.month}
            onChange={(e) => updateField('month', e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('payroll.generate')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
