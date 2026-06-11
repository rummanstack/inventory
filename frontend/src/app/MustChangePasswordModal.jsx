import { useState } from 'react';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { Alert } from '../components/ui.jsx';
import { useInventoryApp } from './useInventoryApp.jsx';

export default function MustChangePasswordModal() {
  const { t, updateProfile } = useInventoryApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    const result = await updateProfile({ currentPassword, password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[10px] no-print">
      <div className="panel-strong w-full max-w-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">{t('auth.mustChangePasswordTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('auth.mustChangePasswordHint')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error ? <Alert type="error">{error}</Alert> : null}

          <label className="block">
            <span className="label">{t('auth.currentPassword')}</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input pl-9"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </span>
          </label>

          <label className="block">
            <span className="label">{t('auth.newPassword')}</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input pl-9"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </span>
            <span className="mt-1 block text-xs text-slate-400">{t('auth.passwordRequirements')}</span>
          </label>

          <label className="block">
            <span className="label">{t('auth.confirmPassword')}</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input pl-9"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </span>
          </label>

          <button type="submit" className="btn-primary mt-2 w-full" disabled={submitting}>
            {submitting ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
            {submitting ? t('auth.resetting') : t('auth.resetPassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
