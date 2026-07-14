import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  MessageCircle,
  ReceiptText,
  Route,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import ImagePlaceholder from '../components/shared/ImagePlaceholder.jsx';
import { whatsappUrl } from '../constants.js';
import { featurePages, getFeaturePage, getSolutionPage, solutionPages } from '../data/seoPages.js';

const featureIcons = {
  'inventory-management': Boxes,
  'retail-pos': ReceiptText,
  accounting: BookOpenText,
  'hr-payroll': Users,
  'purchase-management': Building2,
  'due-collection': CreditCard,
  'dsr-dealer-management': Route,
  'installment-sales': CreditCard,
  reporting: BarChart3,
  'repair-warranty': Wrench,
};

const solutionIcons = {
  'retail-shop': ReceiptText,
  'wholesale-business': Boxes,
  'dealer-distributor': Building2,
  'dsr-sales-team': Route,
  pharmacy: ShieldCheck,
  'grocery-store': Landmark,
};

const pageSupport = {
  accounting: {
    painPoints: [
      'Sales, purchases, expenses, dues, and cash movement live in separate notebooks or spreadsheets.',
      'Owners wait too long to see real profit, receivables, payables, and cash position.',
      'Accountants have to rebuild reports from operational data instead of reviewing ready records.',
    ],
    outcomes: [
      'Faster month-end and day-end visibility for cash, bank, expenses, and receivables.',
      'Cleaner handoff between owner, manager, cashier, and accountant.',
      'Better confidence in ledger, trial balance, profit and loss, and balance sheet review.',
    ],
    relatedModules: ['reporting', 'due-collection', 'purchase-management'],
  },
  'inventory-management': {
    painPoints: [
      'Teams sell items before checking stock availability and reorder too late.',
      'Damaged stock, returns, and purchase receive entries are hard to reconcile later.',
      'The owner cannot quickly see which products move, stall, or tie up cash.',
    ],
    outcomes: [
      'Fewer stock surprises at the counter or during wholesaler delivery planning.',
      'Clearer purchase decisions from low-stock visibility and movement history.',
      'Better connection between stock value, purchases, sales, and profit reporting.',
    ],
    relatedModules: ['retail-pos', 'purchase-management', 'reporting'],
  },
  'retail-pos': {
    painPoints: [
      'Counter billing slows down during rush hours and receipts are inconsistent.',
      'Cash sales, due sales, returns, and stock changes are tracked in different places.',
      'Owners cannot close the day confidently because counter activity is incomplete.',
    ],
    outcomes: [
      'Faster billing with better visibility into sales, stock, and customer balance changes.',
      'Cleaner daily closing through cash sessions, receipts, and daily sales reporting.',
      'A retail workflow that can grow from one counter to a more controlled team setup.',
    ],
    relatedModules: ['inventory-management', 'due-collection', 'reporting'],
  },
  'hr-payroll': {
    painPoints: [
      'Attendance, leave, salary, and employee records are maintained manually.',
      'The business knows team cost only after late manual summaries.',
      'Permissions and user control do not match real job roles inside the company.',
    ],
    outcomes: [
      'Structured employee records with less dependence on ad hoc files and messaging threads.',
      'Better payroll and finance coordination for salary payments, advances, and loans.',
      'Stronger control over who can access which workflow inside the system.',
    ],
    relatedModules: ['accounting', 'reporting'],
  },
  'purchase-management': {
    painPoints: [
      'Supplier balances become unclear when returns, discounts, and payments are not tied to the same record set.',
      'Received stock and supplier statements do not match at review time.',
      'Owners lose time resolving purchase disputes with incomplete history.',
    ],
    outcomes: [
      'Better visibility into purchase receive, supplier due, returns, and payment history.',
      'Cleaner supplier conversations through structured statements and records.',
      'Stronger stock and finance accuracy because purchase activity feeds both sides.',
    ],
    relatedModules: ['inventory-management', 'accounting', 'reporting'],
  },
  'due-collection': {
    painPoints: [
      'Teams collect money without a reliable transaction history behind each balance.',
      'Customer and shop statements are assembled manually during disputes.',
      'Managers cannot prioritize overdue follow-up based on clean ledger data.',
    ],
    outcomes: [
      'Clearer customer and shop balance follow-up from linked sales and payment records.',
      'Better accountability for field collection and in-shop due collection activity.',
      'Fewer collection errors caused by disconnected notes or verbal updates.',
    ],
    relatedModules: ['retail-pos', 'dsr-dealer-management', 'accounting'],
  },
  'dsr-dealer-management': {
    painPoints: [
      'Morning issue, returns, cash, and evening settlement are hard to reconcile across route teams.',
      'Managers depend on calls and handwritten notes to know what happened in the field.',
      'Shop dues and rep-level accountability become unclear after a few sales cycles.',
    ],
    outcomes: [
      'Better route-team control from issue to collection to settlement.',
      'Cleaner accountability for stock, cash, returns, and due balances per rep or route.',
      'More reliable dealer and distributor reporting without rebuilding the day manually.',
    ],
    relatedModules: ['due-collection', 'inventory-management', 'accounting'],
  },
  'installment-sales': {
    painPoints: [
      'Installment schedules drift from the original sale and teams lose track of overdue payments.',
      'Guarantor and customer documentation is scattered across files and chat messages.',
      'Late fee handling and reschedules are inconsistent across customers.',
    ],
    outcomes: [
      'Better collection control through due schedules, overdue visibility, and customer statements.',
      'Stronger documentation around guarantors, supporting files, and credit settings.',
      'A more disciplined installment workflow from sale creation to final closure.',
    ],
    relatedModules: ['due-collection', 'reporting'],
  },
  reporting: {
    painPoints: [
      'Owners receive reports late because daily data has to be recompiled manually.',
      'Sales, stock, finance, HR, and collection reports do not agree with each other.',
      'Managers spend time hunting for the right number instead of acting on it.',
    ],
    outcomes: [
      'Quicker operational review using dashboards and reports tied to live workflows.',
      'Less debate over numbers because teams look at one connected record base.',
      'Better decision-making for stock, due, spending, and profit control.',
    ],
    relatedModules: ['accounting', 'inventory-management', 'retail-pos'],
  },
  'repair-warranty': {
    painPoints: [
      'Service counters lose track of product history, claims, and job status.',
      'Customers return with serial or warranty questions but records are incomplete.',
      'After-sales support is disconnected from the original product sale.',
    ],
    outcomes: [
      'Faster warranty lookup and job follow-up with better product history.',
      'Less dependence on paper slips for repair intake and status tracking.',
      'Better support quality for electronics, appliance, and service-oriented retailers.',
    ],
    relatedModules: ['inventory-management', 'retail-pos'],
  },
  'retail-shop': {
    painPoints: [
      'A busy shop needs quick billing, but stock and due records still have to stay clean.',
      'Owners often discover margin, due, or purchase problems only after the day is over.',
      'Separate apps for POS, stock, accounts, and customer balance create daily friction.',
    ],
    outcomes: [
      'A cleaner retail routine from sale and receipt to stock update and day-end review.',
      'Better control of customer due, purchase activity, and expense visibility.',
      'A path to expand into accounting, HR, service, or installment workflows later.',
    ],
    relatedModules: ['retail-pos', 'inventory-management', 'accounting'],
  },
  'wholesale-business': {
    painPoints: [
      'Wholesale businesses juggle supplier balances, customer dues, and stock movement at the same time.',
      'Large invoice volume makes manual reconciliation too slow.',
      'Cash gets tied up in stock and receivables without enough visibility.',
    ],
    outcomes: [
      'Better control of invoice, purchase, supplier, and customer balance workflows.',
      'Clearer buying and collection decisions from connected reports.',
      'Stronger financial visibility for a business with both payables and receivables.',
    ],
    relatedModules: ['purchase-management', 'due-collection', 'reporting'],
  },
  'dealer-distributor': {
    painPoints: [
      'Stock leaves the warehouse through routes, reps, and shops, but settlement clarity comes late.',
      'Cash, returns, and due records become inconsistent across the field and office.',
      'Management cannot quickly compare issued stock against actual route outcomes.',
    ],
    outcomes: [
      'Better distributor control across stock issue, route activity, collection, and settlement.',
      'Cleaner shop and field-team accountability with less manual follow-up.',
      'More reliable reporting for dealer, route, and collection operations.',
    ],
    relatedModules: ['dsr-dealer-management', 'due-collection', 'accounting'],
  },
  'dsr-sales-team': {
    painPoints: [
      'Field reps manage stock, cash, and customer balance changes outside the office all day.',
      'Managers need route-level accountability without waiting for manual updates.',
      'Collection and return activity is easy to lose when the workflow is informal.',
    ],
    outcomes: [
      'Stronger rep-level accountability from issue through settlement.',
      'Cleaner visibility into route sales, route cash, route dues, and returns.',
      'Less dependency on memory, calls, and handwritten updates.',
    ],
    relatedModules: ['dsr-dealer-management', 'due-collection', 'reporting'],
  },
  pharmacy: {
    painPoints: [
      'Medicine retail requires product, supplier, sales, and daily cash control at the same time.',
      'Purchase and supplier records need to stay traceable as stock changes quickly.',
      'Owners want more than billing; they need cleaner daily operating numbers.',
    ],
    outcomes: [
      'Better visibility into medicine stock, supplier history, due, and expenses.',
      'A more organized pharmacy workflow from purchase receive to sale and reporting.',
      'Stronger operational review for owners managing sales and accounts together.',
    ],
    relatedModules: ['inventory-management', 'purchase-management', 'accounting'],
  },
  'grocery-store': {
    painPoints: [
      'Fast daily transactions create end-of-day confusion when stock and cash are reviewed manually.',
      'Small but frequent purchases and customer dues are easy to lose track of.',
      'Owners need a simple system first, not a heavy rollout that stalls the team.',
    ],
    outcomes: [
      'Cleaner sales, stock, purchase, and due control for a busy grocery operation.',
      'Better day-end clarity around cash, sales, and customer balances.',
      'A simple starting point that can expand as the shop grows.',
    ],
    relatedModules: ['retail-pos', 'inventory-management', 'due-collection'],
  },
};

function useLandingPageMode() {
  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);
}

function PageCard({ page, basePath, Icon }) {
  return (
    <Link to={`${basePath}/${page.slug}`} className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[var(--brand)]/30 hover:shadow-[0_22px_56px_rgba(15,23,42,0.1)]">
      <div className="overflow-hidden rounded-2xl">
        <ImagePlaceholder data={{ src: page.image, alt: page.imageAlt }} heightClass="aspect-[16/10]" fit="cover" position="center" />
      </div>
      <div className="mt-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{page.eyebrow}</p>
          <h3 className="mt-1 text-lg font-black leading-snug text-slate-950">{page.title}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{page.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {page.keywords.map((keyword) => (
          <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{keyword}</span>
        ))}
      </div>
    </Link>
  );
}

function HubPage({ type }) {
  const { language, setLanguage, t } = useLanguage();
  useLandingPageMode();

  const isFeatures = type === 'features';
  const pages = isFeatures ? featurePages : solutionPages;
  const icons = isFeatures ? featureIcons : solutionIcons;
  const title = isFeatures
    ? 'StockLedger Features for Operations, Accounting, HR, and Growth'
    : 'StockLedger Solutions for Retailers, Wholesalers, Dealers, DSR Teams, and Pharmacies';
  const description = isFeatures
    ? 'Explore the major StockLedger modules: inventory, retail POS, accounting, HR and payroll, purchasing, due collection, DSR management, installments, reports, and repair workflows.'
    : 'See how StockLedger fits different business models in Bangladesh, from retail shops and grocery stores to wholesale, dealer, distributor, DSR, and pharmacy operations.';

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <section
        className="relative overflow-hidden pb-16 pt-32 text-white sm:pt-40"
        style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 55%,#1f3a8a 100%)' }}
      >
        <div className="landing-container relative">
          <Link to="/landing" className="text-sm font-bold text-white/70 transition hover:text-white">Home</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">{isFeatures ? 'Product features' : 'Business solutions'}</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">{title}</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">{description}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => {
              const Icon = icons[page.slug] || CheckCircle2;
              return <PageCard key={page.slug} page={page} basePath={isFeatures ? '/features' : '/solutions'} Icon={Icon} />;
            })}
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">How to use these pages</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Browse by workflow first, then by business type</h2>
            <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">
              Feature pages explain what each StockLedger module does and which problems it solves. Solution pages explain how those modules fit together for a real business model like retail, wholesale, distribution, grocery, or pharmacy operations.
            </p>
            <p className="mt-4 text-[15px] font-medium leading-7 text-slate-600">
              That matters for SEO and for buyers. Someone searching for accounting software, retail POS software, inventory software, or DSR management software usually wants a specific workflow. Someone searching for retail shop software or wholesale business software wants a complete setup. These page groups separate those intents clearly.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}

function getRotatingRelatedPages(pages, currentSlug, count = 3) {
  const currentIndex = pages.findIndex((candidate) => candidate.slug === currentSlug);
  if (currentIndex === -1) {
    return pages.slice(0, count);
  }

  const ordered = [
    ...pages.slice(currentIndex + 1),
    ...pages.slice(0, currentIndex),
  ];

  return ordered.slice(0, count);
}

function getDefaultSupport(page, isFeature, relatedPages) {
  const relatedTitles = relatedPages
    .filter((related) => related.slug !== page.slug)
    .slice(0, 3)
    .map((related) => related.eyebrow);

  return {
    painPoints: [
      `${page.eyebrow} work becomes harder when teams split records across spreadsheets, notebooks, and separate apps.`,
      `Managers lose time checking numbers manually instead of reviewing one reliable workflow.`,
      `As the business grows, ${page.eyebrow.toLowerCase()} activity needs clearer accountability and reporting.`,
    ],
    outcomes: [
      `A more structured ${page.eyebrow.toLowerCase()} workflow with fewer manual follow-up steps.`,
      `Cleaner reporting because the page workflow stays connected with the rest of the system.`,
      `A better base for scaling users, branches, or modules later.`,
    ],
    relatedModules: relatedTitles,
  };
}

function DetailPage({ type }) {
  const { slug } = useParams();
  const { language, setLanguage, t } = useLanguage();
  useLandingPageMode();

  const isFeature = type === 'feature';
  const page = isFeature ? getFeaturePage(slug) : getSolutionPage(slug);
  const relatedPages = isFeature ? featurePages : solutionPages;
  const icons = isFeature ? featureIcons : solutionIcons;

  if (!page) {
    return <Navigate to={isFeature ? '/features' : '/solutions'} replace />;
  }

  const Icon = icons[page.slug] || CheckCircle2;
  const sections = page.sections || [
    { title: `Built for ${page.eyebrow.toLowerCase()}`, body: page.description },
    { title: 'Connected with the rest of StockLedger', body: 'Sales, stock, purchases, dues, finance, accounting, HR, reports, permissions, and control workflows can work together in one account instead of spreading records across separate tools.' },
    { title: 'Designed for Bangladeshi business operations', body: 'StockLedger is built around practical workflows used by shops, traders, dealers, distributors, pharmacies, field sales teams, and growing business teams.' },
  ];
  const faqs = page.faqs || [
    [`Is StockLedger suitable for ${page.eyebrow.toLowerCase()}?`, `Yes. StockLedger includes workflows and reporting designed for ${page.eyebrow.toLowerCase()} operations.`],
    ['Can this connect with accounting and reports?', 'Yes. StockLedger is designed so operations, finance, accounting, and reports can stay connected.'],
  ];
  const support = pageSupport[page.slug] || getDefaultSupport(page, isFeature, relatedPages);
  const linkedModules = support.relatedModules
    .map((moduleSlug) => getFeaturePage(moduleSlug) || getSolutionPage(moduleSlug))
    .filter(Boolean);

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      <section
        className="relative overflow-hidden pb-16 pt-32 text-white sm:pt-40"
        style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#14532d 100%)' }}
      >
        <div className="landing-container grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white/70">
              <Link to="/landing" className="transition hover:text-white">Home</Link>
              <span>/</span>
              <Link to={isFeature ? '/features' : '/solutions'} className="transition hover:text-white">{isFeature ? 'Features' : 'Solutions'}</Link>
            </div>
            <div className="mt-6 max-w-3xl">
              <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">{page.eyebrow}</p>
              <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">{page.title}</h1>
              <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">{page.description}</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {page.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">{keyword}</span>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--landing-accent-success)] px-6 text-sm font-black text-white shadow-[0_14px_30px_var(--landing-accent-success-shadow)] transition hover:-translate-y-0.5">
                <MessageCircle size={17} />
                Book Demo
              </a>
              <Link to="/pricing" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">
                See Pricing
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div className="rounded-[32px] border border-white/15 bg-white/10 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur">
            <ImagePlaceholder data={{ src: page.image, alt: page.imageAlt }} heightClass="aspect-[16/11]" fit="cover" position="center" />
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                <Icon size={24} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">Best fit for</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{page.fit || 'Businesses that want this workflow connected with sales, stock, due, finance, accounting, reports, permissions, and daily team activity.'}</p>
              <div className="mt-5 space-y-3">
                {page.keywords.map((keyword) => (
                  <p key={keyword} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={17} className="text-[var(--landing-accent-success)]" />
                    {keyword}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-black text-slate-950">Operational problems this page addresses</h2>
              <div className="mt-4 space-y-3">
                {support.painPoints.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                  <Clock size={14} />
                  StockLedger workflow
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{section.title}</h2>
                <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{section.body}</p>
              </article>
            ))}

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                <Clock size={14} />
                Buying guide
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Why businesses search for this type of software</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">
                Buyers usually land on this page when the current workflow has become too manual, too slow, or too disconnected from daily reporting. They are not just looking for a feature list. They want to know whether {page.eyebrow.toLowerCase()} can stay connected with sales, stock, due, purchasing, finance, user control, and management reporting.
              </p>
              <p className="mt-4 text-[15px] font-medium leading-7 text-slate-600">
                That is where StockLedger is different from a narrow single-purpose tool. It is designed for businesses that want one operational system instead of separate apps that have to be reconciled later. For many teams in Bangladesh, that means fewer duplicate entries, better owner visibility, and cleaner day-end or month-end review.
              </p>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                <Clock size={14} />
                Expected outcomes
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">What usually improves after implementation</h2>
              <div className="mt-4 space-y-3">
                {support.outcomes.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-[15px] font-medium leading-7 text-slate-600">
                    <CheckCircle2 size={18} className="mt-1 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                <Clock size={14} />
                Connected modules
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">What businesses usually connect next</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">
                The strongest SEO pages are also the clearest buying pages. A company that needs {page.eyebrow.toLowerCase()} rarely needs it in isolation. Most teams also ask about reporting, finance visibility, stock accuracy, collection control, role permissions, or route accountability.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {linkedModules.map((related) => {
                  const href = featurePages.some((feature) => feature.slug === related.slug) ? `/features/${related.slug}` : `/solutions/${related.slug}`;
                  return (
                    <Link key={related.slug} to={href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[var(--brand)]/25 hover:bg-white">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{related.eyebrow}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{related.title}</p>
                    </Link>
                  );
                })}
              </div>
            </article>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Frequently asked questions</h2>
              <div className="mt-5 divide-y divide-slate-100">
                {faqs.map(([question, answer]) => (
                  <div key={question} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="text-base font-black text-slate-950">{question}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-brand">
        <div className="landing-container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="landing-eyebrow">Explore more</p>
              <h2 className="landing-section-title">Related {isFeature ? 'features' : 'solutions'}</h2>
              <p className="landing-section-text">Most businesses use several StockLedger workflows together. These related pages show how the pieces connect.</p>
            </div>
            <Link to={isFeature ? '/features' : '/solutions'} className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)] transition hover:gap-3">
              View all
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {getRotatingRelatedPages(relatedPages, page.slug).map((related) => {
              const RelatedIcon = icons[related.slug] || CheckCircle2;
              return <PageCard key={related.slug} page={related} basePath={isFeature ? '/features' : '/solutions'} Icon={RelatedIcon} />;
            })}
          </div>
        </div>
      </section>

      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}

export function FeatureHubPage() {
  return <HubPage type="features" />;
}

export function SolutionHubPage() {
  return <HubPage type="solutions" />;
}

export function FeatureDetailPage() {
  return <DetailPage type="feature" />;
}

export function SolutionDetailPage() {
  return <DetailPage type="solution" />;
}
