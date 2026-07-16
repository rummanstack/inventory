import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, MessageCircle, Phone, Settings, Users } from 'lucide-react';
import { usePublicLanguage, buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import { usePublicPageEffects } from '../hooks/usePublicPageEffects.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';
import { contactPhone, whatsappUrl } from '../constants.js';

const stepIcons = [ClipboardList, Settings, Users, CheckCircle2];

export default function GetStartedPage() {
  const { language, setLanguage, t } = usePublicLanguage();
  const steps = t('getStartedPage.steps').map((item, index) => ({ ...item, Icon: stepIcons[index] }));
  const fitOptions = t('getStartedPage.fitOptions');
  const startingPoints = t('getStartedPage.startingPoints');
  const onboardingChecklist = t('getStartedPage.onboardingChecklist');
  const rolloutComparisons = t('getStartedPage.rolloutComparisons');
  const getStartedFaqs = t('getStartedPage.getStartedFaqs');
  const stagedReasons = t('getStartedPage.stagedReasons');

  usePublicPageEffects();

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      <section className="public-hero pb-16">
        <div className="landing-container grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <Link to={buildLocalizedPath(language, '/landing')} className="public-hero-breadcrumb">{t('seoContent.breadcrumbHome')}</Link>
            <p className="landing-eyebrow mt-6 !text-[var(--landing-accent-teal)]">{t('getStartedPage.eyebrow')}</p>
            <h1 className="public-hero-title">{t('getStartedPage.heroTitle')}</h1>
            <p className="public-hero-text">{t('getStartedPage.heroText')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--landing-accent-success)] px-6 text-sm font-black text-white shadow-[0_14px_30px_var(--landing-accent-success-shadow)] transition hover:-translate-y-0.5">
                <MessageCircle size={17} />
                {t('getStartedPage.bookSetupCall')}
              </a>
              <a href={`tel:${contactPhone}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">
                <Phone size={17} />
                {t('getStartedPage.callNow')}
              </a>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/15 bg-white/10 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--landing-accent-teal)]">{t('getStartedPage.goodFitLabel')}</p>
            <div className="mt-5 space-y-3">
              {fitOptions.map((item) => (
                <p key={item} className="flex items-start gap-3 text-sm font-semibold leading-6 text-white">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--landing-accent-success)]" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">{t('getStartedPage.onboardingPathLabel')}</p>
            <h2 className="landing-section-title">{t('getStartedPage.onboardingPathTitle')}</h2>
            <p className="landing-section-text">{t('getStartedPage.onboardingPathText')}</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ title, text, Icon }, index) => (
              <article key={title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Icon size={22} />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{t('getStartedPage.stepLabel', { number: index + 1 })}</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('getStartedPage.recommendedPathTitle')}</h2>
              <div className="mt-5 space-y-4">
                {startingPoints.map((item) => (
                  <div key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('getStartedPage.prepareTitle')}</h2>
              <div className="mt-5 space-y-3">
                {onboardingChecklist.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
              <p className="mt-5 text-sm font-medium leading-6 text-slate-600">{t('getStartedPage.prepareText2')}</p>
            </article>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{t('getStartedPage.compareNextLabel')}</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('getStartedPage.compareNextTitle')}</h2>
              <div className="mt-5 grid gap-4">
                {rolloutComparisons.map((item) => (
                  <Link key={item.href} to={buildLocalizedPath(language, item.href)} className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-[var(--brand)]/25 hover:bg-white">
                    <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{t('getStartedPage.whyStagedLabel')}</p>
              <div className="mt-5 space-y-3">
                {stagedReasons.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
            </article>
          </div>

          <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('getStartedPage.faqTitle')}</h2>
            <div className="mt-5 divide-y divide-slate-100">
              {getStartedFaqs.map(([question, answer]) => (
                <div key={question} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="text-base font-black text-slate-950">{question}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{answer}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8 rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('getStartedPage.notSureTitle')}</h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">{t('getStartedPage.notSureText')}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to={buildLocalizedPath(language, '/features')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                {t('getStartedPage.compareFeatures')}
                <ArrowRight size={16} />
              </Link>
              <Link to={buildLocalizedPath(language, '/contact')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                {t('getStartedPage.contactTeam')}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}

