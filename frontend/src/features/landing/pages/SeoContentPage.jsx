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
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,var(--bg-dark)_0%,var(--brand-strong)_55%,#1f3a8a_100%)] pb-16 pt-32 text-white sm:pt-40">
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
        </div>
      </section>

      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
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

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,var(--bg-dark)_0%,var(--brand-strong)_58%,#14532d_100%)] pb-16 pt-32 text-white sm:pt-40">
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
              <h2 className="mt-5 text-2xl font-black text-slate-950">Why this matters</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">Focused pages help business owners find the exact StockLedger workflow they need, while the product still stays connected behind the scenes.</p>
              <div className="mt-5 space-y-3">
                {page.keywords.map((keyword) => (
                  <p key={keyword} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={17} className="text-[var(--landing-accent-success)]" />
                    {keyword}
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
              <p className="landing-section-text">StockLedger ranks better and serves users better when each page answers one clear need.</p>
            </div>
            <Link to={isFeature ? '/features' : '/solutions'} className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)] transition hover:gap-3">
              View all
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {relatedPages.filter((related) => related.slug !== page.slug).slice(0, 3).map((related) => {
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
