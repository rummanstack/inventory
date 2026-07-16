import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import PhotoUploadField from '../../../components/PhotoUploadField.jsx';
import PasswordInput from '../../../components/PasswordInput.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useFormState } from '../../../hooks/useFormState';
import { getAssignableRoles } from '../userRoleHierarchy.js';

export default function UserFormModal({ user, onClose, onSave }) {
  const { t, user: actor, pushToast } = useInventoryApp();
  const isEdit = Boolean(user);
  const needsTenant = actor?.role === 'system_developer' && !isEdit;
  const roleOptions = getAssignableRoles(actor?.role);
  const { form, setForm, updateField, error, setError, saving, setSaving } = useFormState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || roleOptions[0],
    status: user?.status || 'active',
    tenantId: '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    if (!needsTenant) return;
    let cancelled = false;
    inventoryApi.listTenants().then((result) => {
      if (cancelled) return;
      const list = result.tenants || [];
      setTenants(list);
      setForm((current) => ({ ...current, tenantId: current.tenantId || list[0]?.id || '' }));
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [needsTenant]);

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || (!isEdit && !form.password.trim())) {
      setError(t('users.required'));
      return;
    }
    if (needsTenant && !form.tenantId) {
      setError(t('users.tenantRequired'));
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.status,
      avatarUrl: form.avatarUrl,
    };
    if (form.password.trim()) {
      payload.password = form.password.trim();
    }
    if (needsTenant) {
      payload.tenantId = form.tenantId;
    }

    if (isEdit) {
      const unchanged =
        !payload.password &&
        payload.name === user.name &&
        payload.email === user.email &&
        payload.role === user.role &&
        payload.status === user.status &&
        payload.avatarUrl === (user.avatarUrl || '');
      if (unchanged) {
        pushToast('info', t('users.editTitle'), t('alerts.noChanges'));
        return;
      }
    }

    setSaving(true);
    setError('');
    const result = await onSave({ id: user?.id, ...payload });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('users.saveFailed'));
    }
  }

  return (
    <Modal title={isEdit ? t('users.editTitle') : t('users.addTitle')} description={t('users.modalDescription')} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <PhotoUploadField label={t('photoUpload.title')} value={form.avatarUrl} onChange={(url) => updateField('avatarUrl', url)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('users.name')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder={t('users.name')} />
          </div>
          <div>
            <label className="label">{t('users.email')}</label>
            <input type="email" className="input" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder={t('users.email')} />
          </div>
          <div>
            <label className="label">{t('users.password')}</label>
            <PasswordInput value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder={isEdit ? t('users.passwordHintEdit') : t('users.password')} />
          </div>
          <div>
            <label className="label">{t('users.role')}</label>
            <Select className="input" value={form.role} onChange={(event) => updateField('role', event.target.value)}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{t(`permissions.roles.${role}`)}</option>
              ))}
            </Select>
          </div>
          {needsTenant ? (
            <div>
              <label className="label">{t('users.tenant')}</label>
              <Select className="input" value={form.tenantId} onChange={(event) => updateField('tenantId', event.target.value)}>
                <option value="">{t('users.selectTenant')}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </Select>
            </div>
          ) : null}
          <div>
            <label className="label">{t('users.status')}</label>
            <Select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="active">{t('users.statusActive')}</option>
              <option value="inactive">{t('users.statusInactive')}</option>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('users.saveUser')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

