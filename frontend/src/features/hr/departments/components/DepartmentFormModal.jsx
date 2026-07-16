import { useEffect, useRef } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useFormState } from '../../../../hooks/useFormState.js';

export default function DepartmentFormModal({ department, employees = [], onClose, onSave }) {
  const { t } = useInventoryApp();
  const isEdit = Boolean(department);
  const formRef = useRef(null);
  const { form, updateField, error, setError, saving, setSaving } = useFormState({
    name: department?.name || '',
    code: department?.code || '',
    status: department?.status || 'ACTIVE',
    headEmployeeId: department?.headEmployeeId || '',
    note: department?.note || '',
  });

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t('departments.nameRequired'));
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: department?.id,
      name: form.name.trim(),
      code: form.code.trim(),
      status: form.status,
      headEmployeeId: form.headEmployeeId || null,
      note: form.note.trim(),
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
      title={isEdit ? t('departments.editTitle') : t('departments.addTitle')}
      description={t('departments.modalDescription')}
      onClose={onClose}
      width="max-w-xl"
    >
      <form ref={formRef} className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">{t('departments.name')} *</label>
            <input className="input" value={form.name} onChange={(e) => updateField('name', e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">{t('departments.code')}</label>
            <input className="input uppercase" value={form.code} onChange={(e) => updateField('code', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('departments.status')}</label>
            <Select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="ACTIVE">{t('departments.active')}</option>
              <option value="INACTIVE">{t('departments.inactive')}</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('departments.head')}</label>
            <Select className="input" value={form.headEmployeeId} onChange={(e) => updateField('headEmployeeId', e.target.value)}>
              <option value="">{t('departments.noHead')}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('departments.note')}</label>
            <textarea className="input" rows={2} value={form.note} onChange={(e) => updateField('note', e.target.value)} />
          </div>
        </div>

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
