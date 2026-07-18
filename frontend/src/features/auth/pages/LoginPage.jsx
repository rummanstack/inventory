import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, KeyRound, Lock, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { Alert } from '../../../components/ui';
import PasswordInput from '../../../components/PasswordInput.jsx';
import AuthShell from '../components/AuthShell.jsx';
import AuthSubmitButton from '../components/AuthSubmitButton.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

export default function LoginPage() {
  const { login, forgotPassword, resetPassword, t } = useInventoryApp();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [view, setView] = useState(resetToken ? 'reset' : 'login');

  const points = [
    { icon: BarChart3, text: t('auth.register.heroPoint1') },
    { icon: Smartphone, text: t('auth.loginPointDevices') },
    { icon: ShieldCheck, text: t('auth.register.heroPoint3') },
  ];

  return (
    <AuthShell
      brand={t('app.brand')}
      eyebrow={t('auth.loginEyebrow')}
      points={points}
      footnote={t('auth.register.heroFootnote')}
      compact
      mobilePlain
    >
      <div className="auth-form-wrap auth-login-wrap mx-auto w-full max-w-md">
        <h1 className="auth-form-title text-3xl font-black tracking-tight text-slate-950">
          {view === 'login' ? t('auth.signIn') : view === 'forgot' ? t('auth.forgotPasswordTitle') : t('auth.resetPasswordTitle')}
        </h1>
        {view === 'login' ? (
          <p className="auth-form-hint mt-2 text-sm font-medium leading-6 text-slate-500">{t('auth.loginHint')}</p>
        ) : null}

        <div className="auth-form-body mt-5">
          {view === 'login' ? (
            <LoginForm login={login} t={t} onForgot={() => setView('forgot')} />
          ) : view === 'forgot' ? (
            <ForgotPasswordForm forgotPassword={forgotPassword} t={t} onBack={() => setView('login')} />
          ) : (
            <ResetPasswordForm resetPassword={resetPassword} t={t} token={resetToken} onBack={() => setView('login')} />
          )}
        </div>
      </div>
    </AuthShell>
  );
}

function LoginForm({ login, t, onForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    const result = await login({ email, password });
    if (!result?.ok) {
      setSubmitError(result?.message || t('auth.loginFailed'));
    }
    setSubmitting(false);
  }

  return (
    <form className="auth-form space-y-4" onSubmit={handleSubmit}>
      {submitError ? (
        <div className="auth-mobile-alert sm:hidden" role="alert" aria-live="assertive">
          <Alert type="error">{submitError}</Alert>
        </div>
      ) : null}

      <label className="auth-field block">
        <span className="label">{t('auth.email')}</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="input h-12 rounded-xl pl-9 focus:border-[var(--brand)] focus:ring-[var(--brand-soft)]"
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </span>
      </label>

      <label className="auth-field block">
        <span className="label">{t('auth.password')}</span>
        <PasswordInput
          leftIcon={<Lock size={16} />}
          className="input h-12 rounded-xl pl-9 focus:border-[var(--brand)] focus:ring-[var(--brand-soft)]"
          id="login-password"
          name="password"
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.passwordPlaceholder')}
          required
        />
      </label>

      <div className="auth-options-row flex items-center justify-between pt-1">
        <label className="auth-remember-control inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
          <input name="remember" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]" />
          {t('auth.rememberMe')}
        </label>
        <button type="button" className="auth-inline-action text-xs font-bold text-[var(--secondary-strong)] hover:underline" onClick={onForgot}>
          {t('auth.forgotPassword')}
        </button>
      </div>

      <AuthSubmitButton submitting={submitting} busyLabel={t('auth.signingIn')}>
        <KeyRound size={17} />
        {t('auth.signIn')}
      </AuthSubmitButton>

      <p className="auth-switch-copy text-center text-xs font-semibold text-slate-500">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-black text-[var(--secondary-strong)] hover:underline">
          {t('auth.registerNow')}
        </Link>
      </p>
    </form>
  );
}

function ForgotPasswordForm({ forgotPassword, t, onBack }) {
  const [email, setEmail] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    const result = await forgotPassword({ email });
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
    <form className="auth-form space-y-4" onSubmit={handleSubmit}>
      <p className="auth-form-copy text-sm text-slate-500">{t('auth.forgotPasswordHint')}</p>

      {submitError ? <div role="alert" aria-live="assertive"><Alert type="error">{submitError}</Alert></div> : null}

      <label className="auth-field block">
        <span className="label">{t('auth.email')}</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="input h-12 rounded-xl pl-9 focus:border-[var(--brand)] focus:ring-[var(--brand-soft)]"
            id="forgot-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="send"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </span>
      </label>

      <AuthSubmitButton submitting={submitting} busyLabel={t('auth.sending')}>
        <Mail size={17} />
        {t('auth.sendResetLink')}
      </AuthSubmitButton>

      <button type="button" className="auth-back-action flex w-full items-center justify-center gap-2 text-xs font-bold text-[var(--secondary-strong)] hover:underline" onClick={onBack}>
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
    <form className="auth-form space-y-4" onSubmit={handleSubmit}>
      <p className="auth-form-copy text-sm text-slate-500">{t('auth.resetPasswordHint')}</p>

      {submitError ? <div role="alert" aria-live="assertive"><Alert type="error">{submitError}</Alert></div> : null}

      <label className="auth-field block">
        <span className="label">{t('auth.newPassword')}</span>
        <PasswordInput
          leftIcon={<Lock size={16} />}
          className="input h-12 rounded-xl pl-9 focus:border-[var(--brand)] focus:ring-[var(--brand-soft)]"
          id="reset-new-password"
          name="new-password"
          autoComplete="new-password"
          enterKeyHint="next"
          aria-describedby="reset-password-requirements"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <span id="reset-password-requirements" className="auth-password-help mt-1 block text-xs text-slate-400">{t('auth.passwordRequirements')}</span>
      </label>

      <label className="auth-field block">
        <span className="label">{t('auth.confirmPassword')}</span>
        <PasswordInput
          leftIcon={<Lock size={16} />}
          className="input h-12 rounded-xl pl-9 focus:border-[var(--brand)] focus:ring-[var(--brand-soft)]"
          id="reset-confirm-password"
          name="confirm-password"
          autoComplete="new-password"
          enterKeyHint="done"
          aria-invalid={Boolean(submitError)}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </label>

      <AuthSubmitButton submitting={submitting} busyLabel={t('auth.resetting')}>
        <KeyRound size={17} />
        {t('auth.resetPassword')}
      </AuthSubmitButton>

      <button type="button" className="auth-back-action flex w-full items-center justify-center gap-2 text-xs font-bold text-[var(--secondary-strong)] hover:underline" onClick={onBack}>
        <ArrowLeft size={14} />
        {t('auth.backToLogin')}
      </button>
    </form>
  );
}
