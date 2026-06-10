import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Alert, Badge, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

export default function ProfilePage() {
  const { user, t, updateProfile } = useInventoryApp();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = { name: form.name.trim(), email: form.email.trim() };
    if (form.password.trim()) {
      payload.password = form.password.trim();
      payload.currentPassword = form.currentPassword;
    }

    const result = await updateProfile(payload);
    setSaving(false);

    if (result.ok) {
      setSuccess(t('profile.updateSuccess'));
      setForm((prev) => ({ ...prev, currentPassword: '', password: '' }));
    } else {
      setError(result.message || t('profile.updateFailed'));
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t('nav.profile')} title={t('profile.title')} description={t('profile.description')} />
      <form onSubmit={handleSubmit} className="panel-strong max-w-xl space-y-5 p-6">
        {error ? <Alert type="error">{error}</Alert> : null}
        {success ? <Alert type="success">{success}</Alert> : null}

        <label className="block">
          <span className="label">{t('profile.name')}</span>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="label">{t('profile.email')}</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="label">{t('profile.newPassword')}</span>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder={t('profile.newPasswordHint')}
          />
        </label>

        <label className="block">
          <span className="label">{t('profile.currentPassword')}</span>
          <input
            className="input"
            type="password"
            value={form.currentPassword}
            onChange={(e) => handleChange('currentPassword', e.target.value)}
            placeholder={t('profile.currentPasswordHint')}
            disabled={!form.password.trim()}
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <p className="flex-1 text-xs text-slate-500">
            {t('profile.role')}: <Badge tone="slate">{t(`permissions.roles.${user?.role}`) || user?.role}</Badge>
          </p>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
}
