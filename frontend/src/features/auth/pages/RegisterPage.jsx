import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Lock,
  Mail,
  PhoneCall,
  Pill,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  User,
} from 'lucide-react';
import { Alert } from '../../../components/ui';
import PasswordInput from '../../../components/PasswordInput.jsx';
import AuthShell from '../components/AuthShell.jsx';
import AuthSubmitButton from '../components/AuthSubmitButton.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'ELECTRONICS', labelKey: 'auth.register.typeElectronics', icon: Smartphone },
  { value: 'GROCERY', labelKey: 'auth.register.typeGrocery', icon: ShoppingBasket },
  { value: 'DRUG_PHARMACY', labelKey: 'auth.register.typePharmacy', icon: Pill },
];

export default function RegisterPage() {
  const { t } = useInventoryApp();
  const [done, setDone] = useState(false);

  const points = [
    { icon: BarChart3, text: t('auth.register.heroPoint1') },
    { icon: PhoneCall, text: t('auth.register.heroPoint2') },
    { icon: ShieldCheck, text: t('auth.register.heroPoint3') },
  ];

  return (
    <AuthShell
      brand={t('app.brand')}
      eyebrow={t('auth.register.eyebrow')}
      title={t('auth.register.heroTitle')}
      points={points}
      footnote={t('auth.register.heroFootnote')}
    >
      {done ? <RegisterSuccess t={t} /> : <RegisterForm t={t} onDone={() => setDone(true)} />}
    </AuthShell>
  );
}

function RegisterSuccess({ t }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-10 text-center">
      <span className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--success-soft)]" style={{ animationDuration: '2.4s' }} />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
          <CheckCircle2 size={34} />
        </span>
      </span>
      <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{t('auth.register.successTitle')}</h2>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{t('auth.register.successHint')}</p>
      <Link to="/login" className="btn-secondary mt-8 flex w-full items-center justify-center gap-2">
        <ArrowLeft size={16} />
        {t('auth.backToLogin')}
      </Link>
    </div>
  );
}

function RegisterForm({ t, onDone }) {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('ELECTRONICS');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    if (password !== confirmPassword) {
      setSubmitError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await inventoryApi.registerBusiness({ businessName, businessType, ownerName, email, phone, password });
      onDone();
    } catch (error) {
      setSubmitError(error?.message || t('auth.register.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mx-auto w-full max-w-lg" onSubmit={handleSubmit}>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">{t('auth.register.title')}</h1>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{t('auth.register.hint')}</p>

      {submitError ? <div className="mt-4"><Alert type="error">{submitError}</Alert></div> : null}

      {/* Business type selector */}
      <fieldset className="mt-6">
        <legend className="label">{t('auth.register.businessType')}</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {BUSINESS_TYPE_OPTIONS.map(({ value, labelKey, icon: Icon }) => {
            const active = businessType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setBusinessType(value)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3.5 text-center transition-all duration-150 ${
                  active
                    ? 'border-[var(--brand-strong)] bg-[var(--brand-soft)] shadow-[0_10px_24px_var(--secondary-shadow)]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    active ? 'bg-[var(--brand-strong)] text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon size={17} />
                </span>
                <span className={`text-[11px] font-bold leading-tight ${active ? 'text-[var(--brand-strong)]' : 'text-slate-600'}`}>
                  {t(labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t('auth.register.businessName')}</span>
            <input
              className="input h-11"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder={t('auth.register.businessNamePlaceholder')}
              required
            />
          </label>

          <label className="block">
            <span className="label">{t('auth.register.ownerName')}</span>
            <span className="relative block">
              <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input h-11 pl-9"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                autoComplete="name"
                required
              />
            </span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t('auth.email')}</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input h-11 pl-9"
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
            <span className="label">{t('auth.register.phone')}</span>
            <span className="relative block">
              <PhoneCall className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="input h-11 pl-9"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                required
              />
            </span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t('auth.password')}</span>
            <PasswordInput
              leftIcon={<Lock size={16} />}
              className="input h-11 pl-9"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="label">{t('auth.confirmPassword')}</span>
            <PasswordInput
              leftIcon={<Lock size={16} />}
              className="input h-11 pl-9"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
        </div>

        <p className="text-xs font-medium leading-5 text-slate-400">{t('auth.passwordRequirements')}</p>
      </div>

      <AuthSubmitButton submitting={submitting} busyLabel={t('auth.register.submitting')}>
        {t('auth.register.submit')}
        <ArrowRight size={18} className="transition duration-200 group-hover:translate-x-1" />
      </AuthSubmitButton>

      <p className="mt-5 text-center text-xs font-semibold text-slate-500">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-black text-[var(--secondary-strong)] hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </form>
  );
}
