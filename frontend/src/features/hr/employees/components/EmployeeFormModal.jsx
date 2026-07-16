import { useEffect, useRef } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../../components/ui.jsx';
import PhotoUploadField from '../../../../components/PhotoUploadField.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../../hooks/useFormState';
import EmployeeDocumentsPanel from './EmployeeDocumentsPanel.jsx';

const GENDERS = ['', 'MALE', 'FEMALE', 'OTHER'];
const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EmployeeFormModal({ employee, departments = [], designations = [], onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(employee);
  const formRef = useRef(null);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: employee?.name || '',
    photoUrl: employee?.photoUrl || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    address: employee?.address || '',
    departmentId: employee?.departmentId || '',
    department: employee?.department || '',
    designationId: employee?.designationId || '',
    designation: employee?.designation || '',
    joinDate: employee?.joinDate || new Date().toISOString().slice(0, 10),
    status: employee?.status || 'ACTIVE',
    note: employee?.note || '',
    emergencyContactName: employee?.emergencyContactName || '',
    emergencyContactPhone: employee?.emergencyContactPhone || '',
    emergencyContactRelation: employee?.emergencyContactRelation || '',
    nationalId: employee?.nationalId || '',
    dateOfBirth: employee?.dateOfBirth || '',
    gender: employee?.gender || '',
    bloodGroup: employee?.bloodGroup || '',
    bankName: employee?.bankName || '',
    bankAccountName: employee?.bankAccountName || '',
    bankAccountNumber: employee?.bankAccountNumber || '',
    bankBranch: employee?.bankBranch || '',
    salaryAmount: employee?.salaryAmount ?? 0,
    payType: employee?.payType || 'MONTHLY',
  });

  async function submitForm(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError(t('employees.nameRequired')); return; }

    setSaving(true);
    setError('');
    const selectedDepartment = departments.find((department) => department.id === form.departmentId);
    const selectedDesignation = designations.find((designation) => designation.id === form.designationId);
    const result = await onSave({
      id: employee?.id,
      name: form.name.trim(),
      photoUrl: form.photoUrl,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      departmentId: form.departmentId || null,
      department: selectedDepartment?.name || form.department.trim(),
      designationId: form.designationId || null,
      designation: selectedDesignation?.name || form.designation.trim(),
      joinDate: form.joinDate,
      status: form.status,
      note: form.note.trim(),
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactPhone: form.emergencyContactPhone.trim(),
      emergencyContactRelation: form.emergencyContactRelation.trim(),
      nationalId: form.nationalId.trim(),
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      bankName: form.bankName.trim(),
      bankAccountName: form.bankAccountName.trim(),
      bankAccountNumber: form.bankAccountNumber.trim(),
      bankBranch: form.bankBranch.trim(),
      salaryAmount: Number(form.salaryAmount) || 0,
      payType: form.payType,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
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
    <Modal
      title={isEdit ? t('employees.editTitle') : t('employees.addTitle')}
      description={t('employees.modalDescription')}
      onClose={onClose}
      width="max-w-5xl"
    >
      <form ref={formRef} className="space-y-5" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <PhotoUploadField label={t('employees.photo')} value={form.photoUrl} onChange={(url) => updateField('photoUrl', url)} />

        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">{t('employees.basicInfo')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="label">{t('employees.name')} *</label>
              <input className="input" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('employees.name')} />
            </div>
            <div>
              <label className="label">{t('employees.status')}</label>
              <Select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                <option value="ACTIVE">{t('employees.active')}</option>
                <option value="INACTIVE">{t('employees.inactive')}</option>
              </Select>
            </div>
            <div>
              <label className="label">{t('employees.department')}</label>
              <Select className="input" value={form.departmentId} onChange={(e) => updateField('departmentId', e.target.value)}>
                <option value="">{t('employees.selectDepartment')}</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="label">{t('employees.designation')}</label>
              <Select className="input" value={form.designationId} onChange={(e) => updateField('designationId', e.target.value)}>
                <option value="">{t('employees.selectDesignation')}</option>
                {designations.map((designation) => <option key={designation.id} value={designation.id}>{designation.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="label">{t('employees.joinDate')}</label>
              <input className="input" type="date" value={form.joinDate} onChange={(e) => updateField('joinDate', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('employees.phone')}</label>
              <input className="input" type="tel" inputMode="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('employees.email')}</label>
              <input className="input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('employees.nationalId')}</label>
              <input className="input" value={form.nationalId} onChange={(e) => updateField('nationalId', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('employees.dateOfBirth')}</label>
              <input className="input" type="date" value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <label className="label">{t('employees.gender')}</label>
              <Select className="input" value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                {GENDERS.map((gender) => <option key={gender || 'empty'} value={gender}>{gender || '-'}</option>)}
              </Select>
            </div>
            <div>
              <label className="label">{t('employees.bloodGroup')}</label>
              <Select className="input" value={form.bloodGroup} onChange={(e) => updateField('bloodGroup', e.target.value)}>
                {BLOOD_GROUPS.map((group) => <option key={group || 'empty'} value={group}>{group || '-'}</option>)}
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">{t('employees.address')}</label>
              <input className="input" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-900">{t('employees.emergencyContact')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('employees.emergencyContactName')}</label>
                <input className="input" value={form.emergencyContactName} onChange={(e) => updateField('emergencyContactName', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('employees.emergencyContactPhone')}</label>
                <input className="input" value={form.emergencyContactPhone} onChange={(e) => updateField('emergencyContactPhone', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{t('employees.emergencyContactRelation')}</label>
                <input className="input" value={form.emergencyContactRelation} onChange={(e) => updateField('emergencyContactRelation', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-900">{t('employees.bankInfo')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('employees.bankName')}</label>
                <input className="input" value={form.bankName} onChange={(e) => updateField('bankName', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('employees.bankBranch')}</label>
                <input className="input" value={form.bankBranch} onChange={(e) => updateField('bankBranch', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('employees.bankAccountName')}</label>
                <input className="input" value={form.bankAccountName} onChange={(e) => updateField('bankAccountName', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('employees.bankAccountNumber')}</label>
                <input className="input" value={form.bankAccountNumber} onChange={(e) => updateField('bankAccountNumber', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-slate-900">{t('employees.salaryInfo')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">{t('employees.salaryAmount')}</label>
              <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.salaryAmount} onChange={(e) => updateField('salaryAmount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">{t('employees.payType')}</label>
              <Select className="input" value={form.payType} onChange={(e) => updateField('payType', e.target.value)}>
                <option value="MONTHLY">{t('employees.payTypeMonthly')}</option>
                <option value="DAILY">{t('employees.payTypeDaily')}</option>
              </Select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">{t('employees.note')}</label>
              <textarea className="input" rows={2} value={form.note} onChange={(e) => updateField('note', e.target.value)} />
            </div>
          </div>
        </div>

        {employee?.id ? (
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-900">{t('employees.documents')}</p>
            <EmployeeDocumentsPanel employeeId={employee.id} />
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('common.save')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Ctrl+S</kbd>
          </button>
        </div>
      </form>
    </Modal>
  );
}

