import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, MessageCircle, Phone, Settings, Users } from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingChatWidget from '../components/DeferredLandingChatWidget.jsx';
import { contactPhone, whatsappUrl } from '../constants.js';

const steps = [
  {
    title: 'Tell us how your business works',
    text: 'Shop, wholesale, dealer, DSR route, pharmacy, accounting, HR, installments, or a mixed workflow. We map the setup before turning on modules.',
    Icon: ClipboardList,
  },
  {
    title: 'Choose the modules you need first',
    text: 'Start with sales, stock, purchase, due, accounting, HR, or DSR. Extra modules can be enabled later when your team is ready.',
    Icon: Settings,
  },
  {
    title: 'Set users, roles, and opening data',
    text: 'We help prepare products, customers, suppliers, opening stock, dues, users, permissions, and business settings.',
    Icon: Users,
  },
  {
    title: 'Train your team and go live',
    text: 'Your staff learns the daily workflows: sale, purchase, collection, settlement, reports, and finance review.',
    Icon: CheckCircle2,
  },
];

const fitOptions = [
  'Retail shop with quick sale, receipts, stock, and customer due',
  'Wholesale or dealer business with DSR, shop due, issue, and settlement',
  'Business that needs accounting reports, ledger, P&L, and balance sheet',
  'Growing team that needs HR, payroll, attendance, leave, roles, and control',
];

const startingPoints = [
  {
    title: 'Retail, grocery, and counter sales',
    text: 'Start with POS, stock, purchase receive, customer due, and daily reporting. Add accounting or HR after the team is stable on the daily flow.',
  },
  {
    title: 'Wholesale, dealer, and route distribution',
    text: 'Start with stock, invoices, due collection, morning issue, evening settlement, and supplier records. Add advanced accounting or branch-level controls after core movement is clean.',
  },
  {
    title: 'Accounting-first businesses',
    text: 'Start with finance accounts, expenses, vouchers, ledger visibility, and the operational workflows that feed those reports. That prevents duplicate entry from the beginning.',
  },
];

const onboardingChecklist = [
  'Product list, categories, and starting stock',
  'Customer, shop, and supplier records',
  'Opening due balances and account balances',
  'User roles, responsibilities, and permission decisions',
  'The one or two daily workflows that must work cleanly first',
];

const rolloutComparisons = [
  { title: 'Get Started', text: 'Best when you already want StockLedger and need the right module rollout, onboarding sequence, and setup plan.', href: '/get-started' },
  { title: 'Contact', text: 'Best when you still need pricing, fit confirmation, or a sales discussion before deciding the rollout path.', href: '/contact' },
  { title: 'Pricing', text: 'Best when you are comparing plan scope, setup coverage, support, users, and commercial structure.', href: '/pricing' },
];

const getStartedFaqs = [
  ['Do I need every module on day one?', 'No. The stronger rollout is to start with the workflows that remove daily friction first, then expand once the team is stable.'],
  ['What is the best first module set for a shop or grocery business?', 'Usually POS, stock, purchases, customer due, and daily reporting. Accounting or HR can follow after the core flow is working cleanly.'],
  ['Can wholesale or dealer businesses start without full accounting first?', 'Yes. Many distribution businesses start with stock, issue, settlement, collections, and supplier workflows, then deepen finance and reporting later.'],
];

export default function GetStartedPage() {
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
        className="relative overflow-hidden pb-16 pt-32 text-white sm:pt-40"
        style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#14532d 100%)' }}
      >
        <div className="landing-container grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <Link to="/landing" className="text-sm font-bold text-white/70 transition hover:text-white">Home</Link>
            <p className="landing-eyebrow mt-6 !text-[var(--landing-accent-teal)]">Get started</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">Start with the right StockLedger setup, not a confusing full system.</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">This page is about onboarding and rollout, not just inquiry. StockLedger has many modules, so the right start is practical: choose the workflows that create daily value first, then expand after the team is confident. That is how complex business software gets adopted successfully.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--landing-accent-success)] px-6 text-sm font-black text-white shadow-[0_14px_30px_var(--landing-accent-success-shadow)] transition hover:-translate-y-0.5">
                <MessageCircle size={17} />
                Book Setup Call
              </a>
              <a href={`tel:${contactPhone}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">
                <Phone size={17} />
                Call Now
              </a>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/15 bg-white/10 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--landing-accent-teal)]">Good fit if you need</p>
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
            <p className="landing-eyebrow">Onboarding path</p>
            <h2 className="landing-section-title">A clean start for a large platform</h2>
            <p className="landing-section-text">You do not need to use every module on day one. The best setup starts with the workflows that create daily value, reduce confusion immediately, and teach the team one operational rhythm at a time.</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ title, text, Icon }, index) => (
              <article key={title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Icon size={22} />
                </div>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">Step {index + 1}</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Recommended first module path by business type</h2>
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
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Prepare these before onboarding</h2>
              <div className="mt-5 space-y-3">
                {onboardingChecklist.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
              <p className="mt-5 text-sm font-medium leading-6 text-slate-600">Good onboarding copy should reduce fear. You do not need a perfect data environment before starting, but you do need enough structure to make the first workflows succeed quickly.</p>
            </article>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">Compare the next step</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Different pages should answer different buyer questions</h2>
              <div className="mt-5 grid gap-4">
                {rolloutComparisons.map((item) => (
                  <Link key={item.href} to={item.href} className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-[var(--brand)]/25 hover:bg-white">
                    <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
                  </Link>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">Why teams trust a staged rollout</p>
              <div className="mt-5 space-y-3">
                {['Training is easier when the team learns one operational rhythm at a time.', 'Data cleanup gets smaller when you start with the records that matter most daily.', 'Management sees earlier value because the first module set is tied to immediate bottlenecks.'].map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
            </article>
          </div>

          <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Frequently asked questions about starting</h2>
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
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Not sure which modules to start with?</h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">Start with your daily bottleneck. If billing is slow, start with POS. If cash and due are unclear, start with sales, customer due, and finance. If your field team is messy, start with DSR issue and settlement. If the owner needs final numbers, start with accounting and reports. The point of this page is to turn a big system into an ordered rollout plan.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/features" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                Compare Features
                <ArrowRight size={16} />
              </Link>
              <Link to="/contact" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                Contact Team
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter t={t} />
      <DeferredLandingChatWidget t={t} />
    </main>
  );
}

