import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../../hooks/useFormState';

export default function EmployeeFormModal({ employee, onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(employee);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: employee?.name || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    address: employee?.address || '',
    department: employee?.department || '',
    designation: employee?.designation || '',
    joinDate: employee?.joinDate || new Date().toISOString().slice(0, 10),
    status: employee?.status || 'ACTIVE',
    note: employee?.note || '',
    salaryAmount: employee?.salaryAmount ?? 0,
    payType: employee?.payType || 'MONTHLY',
  });

  async function submitForm(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('employees.nameRequired')); return; }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: employee?.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      joinDate: form.joinDate,
      status: form.status,
      note: form.note.trim(),
      salaryAmount: Number(form.salaryAmount) || 0,
      payType: form.payType,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <Modal
      title={isEdit ? t('employees.editTitle') : t('employees.addTitle')}
      description={t('employees.modalDescription')}
      onClose={onClose}
      width="max-w-2xl"
    >
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('employees.name')} *</label>
            <input className="input" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('employees.name')} />
          </div>
          <div>
            <label className="label">{t('employees.phone')}</label>
            <input className="input" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('employees.email')}</label>
            <input className="input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('employees.department')}</label>
            <input className="input" value={form.department} onChange={(e) => updateField('department', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('employees.designation')}</label>
            <input className="input" value={form.designation} onChange={(e) => updateField('designation', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('employees.joinDate')}</label>
            <input className="input" type="date" value={form.joinDate} onChange={(e) => updateField('joinDate', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('employees.status')}</label>
            <Select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="ACTIVE">{t('employees.active')}</option>
              <option value="INACTIVE">{t('employees.inactive')}</option>
            </Select>
          </div>
          <div>
            <label className="label">{t('employees.salaryAmount')}</label>
            <input className="input" type="number" min="0" step="0.0001" value={form.salaryAmount} onChange={(e) => updateField('salaryAmount', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label">{t('employees.payType')}</label>
            <Select className="input" value={form.payType} onChange={(e) => updateField('payType', e.target.value)}>
              <option value="MONTHLY">{t('employees.payTypeMonthly')}</option>
              <option value="DAILY">{t('employees.payTypeDaily')}</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('employees.address')}</label>
            <input className="input" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Note</label>
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

