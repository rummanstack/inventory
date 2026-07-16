import { useEffect } from 'react';
import { ArrowRight, Calculator, CheckCircle2, ClipboardList, Layers3, Route, ShieldCheck, Store, Truck } from 'lucide-react';
import { usePublicLanguage, buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import HeroSection from '../components/HeroSection.jsx';
import FeatureStorySection from '../components/FeatureStorySection.jsx';
import SolutionsSection from '../components/SolutionsSection.jsx';
import WorkflowSection from '../components/WorkflowSection.jsx';
import ImageShowcaseSection from '../components/ImageShowcaseSection.jsx';
import TestimonialsSection from '../components/TestimonialsSection.jsx';
import CtaSection from '../components/CtaSection.jsx';
import PricingSection from '../components/PricingSection.jsx';
import FaqSection from '../components/FaqSection.jsx';
import TrustBarSection from '../components/TrustBarSection.jsx';
import ProofSection from '../components/ProofSection.jsx';
import WhoIsItForSection from '../components/WhoIsItForSection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';
import { Link } from 'react-router-dom';

const comparePathIcons = [Store, Truck, ClipboardList];
const decisionBlockIcons = [Layers3, Route, Calculator];

const deferredSectionStyle = {
  contentVisibility: 'auto',
  containIntrinsicSize: '960px',
};

export default function LandingPage() {
  const { language, setLanguage, t } = usePublicLanguage();
  const comparePaths = t('landingExtra.comparePaths').map((item, index) => ({ ...item, Icon: comparePathIcons[index] }));
  const topSearchPages = t('landingExtra.topSearchPages');
  const decisionBlocks = t('landingExtra.decisionBlocks').map((item, index) => ({ ...item, Icon: decisionBlockIcons[index] }));
  const buyerSignals = t('landingExtra.buyerSignals');

  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <HeroSection t={t} />
      <TrustBarSection t={t} />
      <FeatureStorySection t={t} />
      <WorkflowSection t={t} />
      <SolutionsSection t={t} />
      <WhoIsItForSection t={t} />
      <ImageShowcaseSection t={t} />
      <ProofSection t={t} />
      <TestimonialsSection t={t} />

      <section className="landing-section landing-section-soft" style={deferredSectionStyle}>
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">{t('landingExtra.compareEyebrow')}</p>
            <h2 className="landing-section-title">{t('landingExtra.compareTitle')}</h2>
            <p className="landing-section-text">{t('landingExtra.compareText')}</p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {comparePaths.map(({ title, text, Icon, links }) => (
              <article key={title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
                <div className="mt-5 grid gap-3">
                  {links.map((link) => (
                    <Link key={link.href} to={buildLocalizedPath(language, link.href)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-[var(--brand)]/30 hover:bg-white">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-brand" style={deferredSectionStyle}>
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">{t('landingExtra.popularEyebrow')}</p>
            <h2 className="landing-section-title">{t('landingExtra.popularTitle')}</h2>
            <p className="landing-section-text">{t('landingExtra.popularText')}</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {topSearchPages.map((page) => (
              <Link key={page.href} to={buildLocalizedPath(language, page.href)} className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                {page.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft" style={deferredSectionStyle}>
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">{t('landingExtra.structureEyebrow')}</p>
            <h2 className="landing-section-title">{t('landingExtra.structureTitle')}</h2>
            <p className="landing-section-text">{t('landingExtra.structureText')}</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {decisionBlocks.map(({ title, text, Icon }) => (
              <article key={title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">
                <ShieldCheck size={14} />
                {t('landingExtra.searchIntentLabel')}
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('landingExtra.searchIntentTitle')}</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{t('landingExtra.searchIntentText1')}</p>
              <p className="mt-4 text-[15px] font-medium leading-7 text-slate-600">{t('landingExtra.searchIntentText2')}</p>
            </article>

            <article className="rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('landingExtra.buyerMeansTitle')}</h2>
              <div className="mt-5 space-y-3">
                {buyerSignals.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to={buildLocalizedPath(language, '/features')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                  {t('landingExtra.exploreFeatures')}
                  <ArrowRight size={16} />
                </Link>
                <Link to={buildLocalizedPath(language, '/solutions')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                  {t('landingExtra.exploreSolutions')}
                  <ArrowRight size={16} />
                </Link>
                <Link to={buildLocalizedPath(language, '/software')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                  {t('landingExtra.softwareGuides')}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <PricingSection t={t} />
      <FaqSection t={t} />
      <CtaSection t={t} />
      <ContactSection t={t} />
      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}
