import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Calculator, Route, ShieldCheck, Users } from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingChatWidget from '../components/DeferredLandingChatWidget.jsx';
import PricingSection from '../components/PricingSection.jsx';
import FaqSection from '../components/FaqSection.jsx';

const pricingDrivers = [
  {
    title: 'Business model and workflow depth',
    text: 'A retail counter using POS, stock, and due has different needs than a dealer, distributor, or installment business running route settlement, collections, or advanced accounting.',
    Icon: Boxes,
  },
  {
    title: 'Users, branches, and control needs',
    text: 'Role-based access, multi-user processes, branch structure, approval control, and reporting visibility usually influence the final setup more than headline price alone.',
    Icon: Users,
  },
  {
    title: 'Modules turned on first',
    text: 'Sales, inventory, purchases, accounting, HR, DSR, repair, warranty, and installment workflows do not need to go live at the same time. The best pricing discussion starts with priority modules.',
    Icon: Calculator,
  },
  {
    title: 'Onboarding and rollout shape',
    text: 'Opening stock, dues, suppliers, products, user roles, training scope, and data cleanup change the effort required to launch well.',
    Icon: Route,
  },
];

const planFit = [
  {
    title: 'Retail and grocery operations',
    text: 'Usually start with POS, stock, customer due, purchases, expenses, and daily reports. The commercial question is less about feature count and more about how quickly the counter and day-end review become cleaner.',
  },
  {
    title: 'Wholesale, dealer, and distributor teams',
    text: 'Usually care about invoice control, route settlement, supplier balance, collection, stock issue, and reporting visibility across more people and more daily movement.',
  },
  {
    title: 'Accounting and control-focused businesses',
    text: 'Usually evaluate StockLedger based on whether daily operations, finance, ledger, statements, and owner reporting can live in one system instead of separate tools.',
  },
];

export default function PricingPage() {
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

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <section
        className="relative overflow-hidden pb-14 pt-32 text-white sm:pt-40"
        style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#1f3a8a 100%)' }}
      >
        <div className="landing-container">
          <Link to="/landing" className="text-sm font-bold text-white/70 transition hover:text-white">Home</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">Pricing</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">StockLedger pricing for growing businesses</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">Choose the right plan for sales, inventory, accounting, HR, DSR, installments, reports, and business control. This page is for commercial evaluation: which setup fits your operation, what affects final scope, and how to discuss rollout without overbuying on day one.</p>
            <Link to="/contact" className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-[var(--brand-strong)] transition hover:-translate-y-0.5">
              Talk to Sales
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <PricingSection t={t} />

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">Buying guidance</p>
            <h2 className="landing-section-title">How businesses usually evaluate the right plan</h2>
            <p className="landing-section-text">The strongest pricing page does more than list tiers. It helps a buyer understand what they are actually paying for: workflow coverage, operational control, onboarding effort, and how many modules should start first.</p>
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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">Scope factors</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">What usually affects final pricing</h2>
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
              Commercial clarity
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">What this page should help you decide</h2>
            <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">If you already know your workflow and want a proposal, use the Contact page. If you know you want StockLedger but are unsure which modules should start first, use the Get Started page. Pricing sits in the middle: it helps you evaluate plan fit, compare module scope, and understand which commercial conversation should happen next.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/contact" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                Contact Sales
                <ArrowRight size={16} />
              </Link>
              <Link to="/get-started" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                Plan My Setup
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FaqSection t={t} />
      <LandingFooter t={t} />
      <DeferredLandingChatWidget t={t} />
    </main>
  );
}

