import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Calculator, Route, ShieldCheck, Users } from 'lucide-react';
import { usePublicLanguage, buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';
import PricingSection from '../components/PricingSection.jsx';
import FaqSection from '../components/FaqSection.jsx';

const pricingDriverIcons = [Boxes, Users, Calculator, Route];

export default function PricingPage() {
  const { language, setLanguage, t } = usePublicLanguage();
  const pricingDrivers = t('pricingPage.pricingDrivers').map((item, index) => ({ ...item, Icon: pricingDriverIcons[index] }));
  const planFit = t('pricingPage.planFit');

  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <section
        className="relative overflow-hidden pb-14 pt-32 text-white sm:pt-40"
        style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#1f3a8a 100%)' }}
      >
        <div className="landing-container">
          <Link to={buildLocalizedPath(language, '/landing')} className="text-sm font-bold text-white/70 transition hover:text-white">{t('seoContent.breadcrumbHome')}</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">{t('pricingPage.eyebrow')}</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">{t('pricingPage.heroTitle')}</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">{t('pricingPage.heroText')}</p>
            <Link to={buildLocalizedPath(language, '/contact')} className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-[var(--brand-strong)] transition hover:-translate-y-0.5">
              {t('pricingPage.talkToSales')}
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <PricingSection t={t} />

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">{t('pricingPage.buyingGuideEyebrow')}</p>
            <h2 className="landing-section-title">{t('pricingPage.buyingGuideTitle')}</h2>
            <p className="landing-section-text">{t('pricingPage.buyingGuideText')}</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {planFit.map((item) => (
              <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
                <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{t('pricingPage.scopeFactorsLabel')}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('pricingPage.scopeFactorsTitle')}</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {pricingDrivers.map(({ title, text, Icon }) => (
                <article key={title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">
              <ShieldCheck size={14} />
              {t('pricingPage.clarityLabel')}
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('pricingPage.clarityTitle')}</h2>
            <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{t('pricingPage.clarityText')}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to={buildLocalizedPath(language, '/contact')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                {t('pricingPage.contactSales')}
                <ArrowRight size={16} />
              </Link>
              <Link to={buildLocalizedPath(language, '/get-started')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                {t('pricingPage.planMySetup')}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FaqSection t={t} />
      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}

