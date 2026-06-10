import { useState } from 'react';
import { KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { Alert, ToastViewport } from '../components/ui';
import { useInventoryApp } from './useInventoryApp.jsx';
import loginHero from '../assets/login-hero.png';

export default function LoginPage() {
  const { loadError, login, toasts, dismissToast, t } = useInventoryApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    const result = await login({ email, password });
    if (!result.ok) setSubmitError(result.message);
    setSubmitting(false);
  }

  return (
    <div className="page-shell">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] shadow-[0_24px_70px_rgba(15,23,42,0.18)] lg:grid-cols-2">

          {/* Hero image */}
          <div className="hidden bg-[var(--login-hero-bg)] lg:block">
            <img src={loginHero} alt="" className="h-full w-full object-cover object-center" />
          </div>

          {/* Login form */}
          <div className="flex flex-col justify-center bg-white px-8 py-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--secondary-soft)] text-[var(--secondary-strong)]">
                <KeyRound size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('app.brand')}</p>
                <h1 className="text-lg font-black text-slate-950">{t('auth.loginTitle')}</h1>
              </div>
            </div>

            {loadError ? <Alert type="error" className="mb-4">{loadError}</Alert> : null}
            {submitError ? <Alert type="error" className="mb-4">{submitError}</Alert> : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="label">{t('auth.email')}</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    className="input pl-9"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="label">{t('auth.password')}</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    className="input pl-9"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                  />
                </span>
              </label>

              <button type="submit" className="btn-primary mt-2 w-full" disabled={submitting}>
                {submitting ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
                {submitting ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
