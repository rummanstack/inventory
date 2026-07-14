import { useEffect } from 'react';
import { ArrowRight, Calculator, CheckCircle2, Layers3, Route, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage';
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
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import { Link } from 'react-router-dom';

const decisionBlocks = [
  {
    title: 'A single system for daily operations',
    text: 'StockLedger is designed for businesses that are tired of splitting sales, stock, dues, purchases, cash review, and reporting across separate tools. That positioning matters for SEO because buyers usually search from a real workflow problem, not from a generic software category alone.',
    Icon: Layers3,
  },
  {
    title: 'A modular rollout instead of a heavy launch',
    text: 'The platform includes accounting, HR, DSR, installments, reporting, and other workflows, but businesses do not need to launch everything at once. Stronger landing-page copy should make that clear because it lowers buyer friction.',
    Icon: Route,
  },
  {
    title: 'Operational clarity for owners and managers',
    text: 'The core promise is not just billing speed. It is cleaner visibility into stock, collections, supplier balances, expenses, profit, and team activity from one connected record set.',
    Icon: Calculator,
  },
];

const buyerSignals = [
  'You want separate feature pages for inventory, POS, accounting, HR, DSR, reporting, and other workflows.',
  'You need solution pages for retail, wholesale, dealer, distributor, grocery, and pharmacy use cases.',
  'You want Contact, Pricing, and Get Started to serve different search and buying intents.',
  'You need a site that explains how StockLedger fits a growing business, not just a small tool list.',
];

export default function LandingPage() {
  const { language, setLanguage, t } = useLanguage();

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

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">Why this site is structured this way</p>
            <h2 className="landing-section-title">StockLedger is broad, so the SEO architecture has to be broad too</h2>
            <p className="landing-section-text">A business platform with accounting, stock, POS, due collection, DSR, HR, reporting, installment sales, and repair workflows should not force every search intent into one landing page. This page introduces the platform. The deeper feature and solution pages explain specific workflows and business models in more detail.</p>
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
                Search intent coverage
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">The homepage should explain the platform without swallowing every keyword</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">That is why StockLedger now has stronger internal SEO structure. The homepage introduces the connected system. Feature pages explain module-level intent like inventory management software, retail POS software, accounting software, HR and payroll software, or business reporting software. Solution pages explain business-type intent like retail shop software, wholesale business software, and dealer or distributor software.</p>
              <p className="mt-4 text-[15px] font-medium leading-7 text-slate-600">This is better for ranking and better for buyers. It gives Google clearer topical focus and gives people cleaner paths based on what they are actually searching for.</p>
            </article>

            <article className="rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">What this means for a buyer</h2>
              <div className="mt-5 space-y-3">
                {buyerSignals.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/features" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                  Explore Features
                  <ArrowRight size={16} />
                </Link>
                <Link to="/solutions" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                  Explore Solutions
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
      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}
