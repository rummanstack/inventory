import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { Alert, ToastViewport } from '../../../components/ui';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import loginHero from '../../../assets/login-hero.png';
import logoMark from '../../../assets/stockledger-logo-mark.svg';

export default function LoginPage() {
  const { login, forgotPassword, resetPassword, toasts, dismissToast, t } = useInventoryApp();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [view, setView] = useState(resetToken ? 'reset' : 'login');

  return (
    <div className="page-shell">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] shadow-[0_24px_70px_rgba(15,23,42,0.18)] lg:grid-cols-2">

          {/* Hero image */}
          <div className="hidden bg-[var(--login-hero-bg)] lg:block">
            <img src={loginHero} alt="" className="h-full w-full object-cover object-center" />
          </div>

          {/* Form */}
          <div className="flex flex-col justify-center bg-white px-8 py-10">
            <div className="mb-8 flex items-center gap-3">
              <Link to="/" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl transition hover:opacity-80">
                <img src={logoMark} alt="" className="h-full w-full object-contain" />
              </Link>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{t('app.brand')}</p>
                <h1 className="text-lg font-black text-slate-950">
                  {view === 'login' ? t('auth.loginTitle') : view === 'forgot' ? t('auth.forgotPasswordTitle') : t('auth.resetPasswordTitle')}
                </h1>
              </div>
            </div>

            {view === 'login' ? (
              <LoginForm login={login} t={t} onForgot={() => setView('forgot')} />
            ) : view === 'forgot' ? (
              <ForgotPasswordForm forgotPassword={forgotPassword} t={t} onBack={() => setView('login')} />
            ) : (
              <ResetPasswordForm resetPassword={resetPassword} t={t} token={resetToken} onBack={() => setView('login')} />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function LoginForm({ login, t, onForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    await login({ email, password });
    setSubmitting(false);
  }

  return (
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

      <button type="button" className="block w-full text-center text-xs font-bold text-[var(--secondary-strong)] hover:underline" onClick={onForgot}>
        {t('auth.forgotPassword')}
      </button>
    </form>
  );
}

function ForgotPasswordForm({ forgotPassword, t, onBack }) {
  const [email, setEmail] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    const result = await forgotPassword({ email, orgSlug });
    if (!result.ok) {
      setSubmitError(result.message);
    } else {
      setDone(true);
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert type="success">{t('auth.resetRequestSent')}</Alert>
        <button type="button" className="btn-secondary flex w-full items-center justify-center gap-2" onClick={onBack}>
          <ArrowLeft size={16} />
          {t('auth.backToLogin')}
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-slate-500">{t('auth.forgotPasswordHint')}</p>

      {submitError ? <Alert type="error">{submitError}</Alert> : null}

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
        <span className="label">{t('auth.orgCode')}</span>
        <input
          className="input"
          type="text"
          value={orgSlug}
          onChange={(e) => setOrgSlug(e.target.value)}
          placeholder={t('auth.orgCodePlaceholder')}
        />
        <span className="mt-1 block text-xs text-slate-400">{t('auth.orgCodeHint')}</span>
      </label>

      <button type="submit" className="btn-primary mt-2 w-full" disabled={submitting}>
        {submitting ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />}
        {submitting ? t('auth.sending') : t('auth.sendResetLink')}
      </button>

      <button type="button" className="flex w-full items-center justify-center gap-2 text-xs font-bold text-[var(--secondary-strong)] hover:underline" onClick={onBack}>
        <ArrowLeft size={14} />
        {t('auth.backToLogin')}
      </button>
    </form>
  );
}

function ResetPasswordForm({ resetPassword, t, token, onBack }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    if (password !== confirmPassword) {
      setSubmitError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    const result = await resetPassword({ token, password });
    if (!result.ok) {
      setSubmitError(result.message);
    } else {
      setDone(true);
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert type="success">{t('auth.resetSuccess')}</Alert>
        <button type="button" className="btn-secondary flex w-full items-center justify-center gap-2" onClick={onBack}>
          <ArrowLeft size={16} />
          {t('auth.backToLogin')}
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-slate-500">{t('auth.resetPasswordHint')}</p>

      {submitError ? <Alert type="error">{submitError}</Alert> : null}

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

      <button type="button" className="flex w-full items-center justify-center gap-2 text-xs font-bold text-[var(--secondary-strong)] hover:underline" onClick={onBack}>
        <ArrowLeft size={14} />
        {t('auth.backToLogin')}
      </button>
    </form>
  );
}
