import { useState } from 'react';
import { KeyRound, Loader2, Save } from 'lucide-react';
import { Alert, Badge, SectionHeader } from '../../../components/ui.jsx';
import PhotoUploadField from '../../../components/PhotoUploadField.jsx';
import PasswordInput from '../../../components/PasswordInput.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

export default function ProfilePage() {
  const { user, t, updateProfile, confirm, logout } = useInventoryApp();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  function handleProfileChange(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePasswordChange(field, value) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSavingProfile(true);
    await updateProfile({
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      avatarUrl: profileForm.avatarUrl,
    });
    setSavingProfile(false);
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword || !passwordForm.password || !passwordForm.confirmPassword) {
      setPasswordError(t('profile.passwordFieldsRequired'));
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError(t('auth.passwordMismatch'));
      return;
    }

    const { confirmed } = await confirm({
      title: t('profile.changePasswordConfirmTitle'),
      description: t('profile.changePasswordConfirmDescription'),
      confirmLabel: t('profile.changePasswordConfirmButton'),
      tone: 'amber',
      consequences: [t('profile.changePasswordConsequence')],
    });
    if (!confirmed) return;

    setChangingPassword(true);
    const result = await updateProfile({
      password: passwordForm.password,
      currentPassword: passwordForm.currentPassword,
    });

    if (!result.ok) {
      setChangingPassword(false);
      setPasswordError(result.message);
      return;
    }

    // The server just revoked every session for this account, including
    // the one making this request — reflect that immediately instead of
    // waiting for a stray API call to 401 later.
    setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
    await logout();
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t('nav.profile')} title={t('profile.title')} description={t('profile.description')} />

      <form onSubmit={handleProfileSubmit} className="panel-strong max-w-xl space-y-5 p-6">
        <PhotoUploadField
          label={t('photoUpload.title')}
          value={profileForm.avatarUrl}
          onChange={(url) => handleProfileChange('avatarUrl', url)}
        />

        <label className="block">
          <span className="label">{t('profile.name')}</span>
          <input
            className="input"
            type="text"
            value={profileForm.name}
            onChange={(e) => handleProfileChange('name', e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="label">{t('profile.email')}</span>
          <input
            className="input"
            type="email"
            value={profileForm.email}
            onChange={(e) => handleProfileChange('email', e.target.value)}
            required
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <p className="flex-1 text-xs text-slate-500">
            {t('profile.role')}: <Badge tone="slate">{t(`permissions.roles.${user?.role}`) || user?.role}</Badge>
          </p>
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {savingProfile ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>

      <form onSubmit={handlePasswordSubmit} className="panel-strong max-w-xl space-y-5 p-6">
        <div>
          <h2 className="section-title">{t('profile.changePasswordTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('profile.changePasswordDescription')}</p>
        </div>

        {passwordError ? <Alert type="error">{passwordError}</Alert> : null}

        <label className="block">
          <span className="label">{t('profile.currentPassword')}</span>
          <PasswordInput
            value={passwordForm.currentPassword}
            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <label className="block">
          <span className="label">{t('profile.newPassword')}</span>
          <PasswordInput
            value={passwordForm.password}
            onChange={(e) => handlePasswordChange('password', e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="block">
          <span className="label">{t('profile.confirmPassword')}</span>
          <PasswordInput
            value={passwordForm.confirmPassword}
            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
            placeholder={t('profile.confirmPasswordHint')}
            autoComplete="new-password"
            required
          />
        </label>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary" disabled={changingPassword}>
            {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {changingPassword ? t('common.saving') : t('profile.changePasswordButton')}
          </button>
        </div>
      </form>
    </div>
  );
}
