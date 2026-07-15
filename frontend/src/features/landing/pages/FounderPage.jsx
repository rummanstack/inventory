import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Facebook,
  Globe,
  Heart,
  Lightbulb,
  Linkedin,
  MessageCircle,
  Phone,
  Quote,
  Send,
  Shield,
  Twitter,
  Users,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';
import { contactPhone, whatsappUrl } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';
import founderPhoto from '../../../assets/landing/business-owner.png';

const SOCIAL_LINKS = [
  { href: '#', Icon: Linkedin, label: 'LinkedIn' },
  { href: '#', Icon: Twitter, label: 'Twitter' },
  { href: '#', Icon: Facebook, label: 'Facebook' },
  { href: '#', Icon: Send, label: 'Telegram' },
].filter((link) => link.href && link.href !== '#');

const VALUE_ICONS = [Heart, Shield, Zap, Lightbulb, Users, Globe];
const founderSeoReasons = [
  'Founder pages can support branded search and trust evaluation when buyers want to know who is behind the software.',
  'For a business platform, trust is commercial SEO, not decoration. Buyers often compare the company as much as the features.',
  'This page works best when it explains why the founder built StockLedger and what operational problem the product exists to solve.',
];

export default function FounderPage() {
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  const stats = t('landing.founder.stats') || [];
  const storyParagraphs = t('landing.founder.storyParagraphs') || [];
  const timeline = t('landing.founder.timeline') || [];
  const values = t('landing.founder.values') || [];

  return (
    <main className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      <section
        className="relative overflow-hidden pb-0 pt-28 sm:pt-36"
        style={{
          background: 'linear-gradient(160deg, var(--bg-dark) 0%, var(--landing-founder-hero-mid) 50%, var(--landing-founder-hero-end) 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/3 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[var(--brand)] opacity-10 blur-[140px]" />
          <div className="absolute right-0 top-1/2 h-[300px] w-[300px] rounded-full bg-[var(--landing-accent-teal)] opacity-8 blur-[100px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="landing-container relative">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link to="/landing" className="transition hover:text-white">{t('landing.founder.breadcrumbHome')}</Link>
            <span>/</span>
            <span className="text-slate-300">{t('landing.founder.breadcrumbCurrent')}</span>
          </div>

          <div className="mt-10 flex flex-col items-center gap-10 pb-0 lg:flex-row lg:items-end lg:gap-16">
            <div className="max-w-xl lg:pb-16">
              <span className="landing-eyebrow !text-[var(--landing-accent-teal)]">{t('landing.founder.eyebrow')}</span>
              <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                {t('landing.founder.name')}
              </h1>
              <p className="mt-2 text-base font-bold text-[var(--landing-accent-teal)]">{t('landing.founder.title')}</p>
              <p className="mt-5 text-base font-medium leading-7 text-slate-300 sm:text-lg">
                {t('landing.founder.tagline')}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map(({ value, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 px-4 py-3 text-center backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex items-center gap-2">
                {SOCIAL_LINKS.map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20"
                  >
                    <Icon size={16} />
                  </a>
                ))}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--landing-tone-success-border)] bg-[var(--landing-accent-success-soft)] px-4 text-sm font-bold text-[var(--landing-accent-success)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--landing-accent-success-soft)]"
                >
                  <MessageCircle size={15} />
                  {t('landing.founder.whatsapp')}
                </a>
              </div>
            </div>

            <div className="relative shrink-0 self-end">
              <div className="absolute inset-0 -m-6 rounded-full bg-[var(--brand)] opacity-20 blur-[60px]" />
              <div
                className="relative h-[340px] w-[280px] overflow-hidden rounded-[32px] sm:h-[400px] sm:w-[320px]"
                style={{
                  background: 'linear-gradient(145deg,var(--brand),var(--brand-strong) 40%,var(--landing-accent-teal))',
                  padding: '3px',
                }}
              >
                <div className="h-full w-full overflow-hidden rounded-[29px] bg-slate-800">
                  <img
                    src={founderPhoto}
                    alt={t('landing.founder.photoAlt')}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))]">
                  <img loading="lazy" decoding="async" src={stockLedgerLogoIcon} alt="" className="h-5 w-5 object-contain" />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-950">StockLedger</p>
                  <p className="text-[10px] font-semibold text-slate-500">{t('landing.founder.location')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b border-slate-100"
        style={{ background: 'linear-gradient(180deg,var(--landing-surface-tint-start) 0%,var(--landing-surface-tint-end) 100%)' }}
      >
        <div className="landing-container py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Quote size={36} className="mx-auto text-[var(--brand)]/30" />
            <blockquote className="mt-4 text-xl font-bold leading-8 text-slate-800 sm:text-2xl sm:leading-9">
              &ldquo;{t('landing.founder.quote')}&rdquo;
            </blockquote>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--brand)]">
              {t('landing.founder.quoteBy')}
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <p className="landing-eyebrow">Why this page matters</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Founder trust is part of commercial SEO</h2>
              <p className="mt-4 text-[15px] font-medium leading-7 text-slate-600">A buyer looking at business software often asks two questions at the same time: does the platform fit the workflow, and does the company behind it understand the business reality? That is why the founder page is not separate from SEO. It supports brand trust, product credibility, and evaluation intent.</p>
              <div className="mt-5 space-y-3">
                {founderSeoReasons.map((reason) => (
                  <p key={reason} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <ArrowRight size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" />
                    {reason}
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">What buyers usually want from a founder page</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">They want a credible story, a reason the software exists, and enough signal to believe the team understands daily operations in retail, wholesale, distribution, accounting, and management workflows. This page now supports that better.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="grid gap-16 lg:grid-cols-[1fr_minmax(0,1.1fr)]">
            <div>
              <p className="landing-eyebrow">{t('landing.founder.storyEyebrow')}</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                {t('landing.founder.storyTitle')}
              </h2>
              <div className="mt-6 space-y-5 text-[15px] leading-7 text-slate-600">
                {storyParagraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-primary-btn !bg-[var(--landing-accent-success)] !shadow-[0_16px_32px_var(--landing-accent-success-shadow)] hover:!bg-[var(--landing-accent-success-strong)]"
                >
                  <MessageCircle size={18} />
                  {t('landing.founder.talkWhatsApp')}
                </a>
                <Link to="/landing" className="landing-secondary-btn">
                  {t('landing.founder.explore')}
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div>
              <p className="landing-eyebrow">{t('landing.founder.journeyEyebrow')}</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                {t('landing.founder.journeyTitle')}
              </h2>
              <div className="mt-8 space-y-0">
                {timeline.map(({ year, title, body }, index) => (
                  <div key={year} className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-[0_8px_20px_rgba(var(--slate-900),0.18)]"
                        style={{
                          background: 'linear-gradient(135deg,var(--brand),var(--brand-strong))',
                        }}
                      >
                        {index + 1}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-gradient-to-b from-[var(--brand)]/30 to-transparent" />
                      )}
                    </div>

                    <div className={index < timeline.length - 1 ? 'pb-8' : 'pb-0'}>
                      <span className="inline-block rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[var(--brand-strong)]">
                        {year}
                      </span>
                      <h3 className="mt-2 font-black text-slate-950">{title}</h3>
                      <p className="mt-1.5 text-[14px] leading-6 text-slate-600">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="text-center">
            <p className="landing-eyebrow">{t('landing.founder.valuesEyebrow')}</p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              {t('landing.founder.valuesTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-slate-600">
              {t('landing.founder.valuesText')}
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(({ title, body }, index) => {
              const Icon = VALUE_ICONS[index % VALUE_ICONS.length];
              return (
                <div
                  key={title}
                  className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_4px_16px_var(--landing-shadow-brand-soft)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_var(--landing-shadow-brand)]"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
                    <Icon size={20} className="text-[var(--brand-strong)]" />
                  </span>
                  <h3 className="mt-4 font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-slate-600">{body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,var(--brand-strong)_0%,var(--landing-founder-hero-mid)_55%,var(--landing-founder-hero-end)_100%)] p-8 sm:p-12 lg:p-16">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--brand)] opacity-15 blur-[80px]" />
              <div className="absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-[var(--landing-accent-teal)] opacity-10 blur-[60px]" />
            </div>

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-14">
              <div className="shrink-0">
                <div
                  className="h-24 w-24 overflow-hidden rounded-full sm:h-28 sm:w-28"
                  style={{
                    background: 'linear-gradient(135deg,var(--brand),var(--landing-accent-teal))',
                    padding: '2px',
                  }}
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    src={founderPhoto}
                    alt={t('landing.founder.photoAlt')}
                    className="h-full w-full rounded-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="flex-1">
                <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">{t('landing.founder.noteEyebrow')}</p>
                <p className="mt-3 text-lg font-bold leading-7 text-white sm:text-xl">
                  {t('landing.founder.noteText')}
                </p>
                <p className="mt-3 text-sm font-bold text-[var(--landing-accent-teal)]">{t('landing.founder.noteBy')}</p>
              </div>

              <div className="flex shrink-0 flex-col gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--landing-accent-success)] px-5 text-sm font-black text-white shadow-[0_12px_28px_var(--landing-accent-success-shadow)] transition hover:-translate-y-0.5"
                >
                  <MessageCircle size={16} />
                  {t('landing.founder.whatsappMe')}
                </a>
                <a
                  href={`tel:${contactPhone}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <Phone size={16} />
                  {t('landing.founder.callMe')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter t={t} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}

