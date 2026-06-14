import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import heroDashboardImage from '../../../assets/landing/hero-dashboard.png';
import ownerLaptopImage from '../../../assets/landing/business-owner-dashboard.png';
import retailCounterImage from '../../../assets/landing/retail-quick-sale.png';
import warehouseStockImage from '../../../assets/landing/warehouse-stock-control.png';
import dsrSettlementImage from '../../../assets/landing/dsr-evening-settlement.png';
import purchaseReceiveImage from '../../../assets/landing/purchase-receive.png';
import dueCollectionImage from '../../../assets/landing/customer-due-ledger.png';
import profitReportImage from '../../../assets/landing/profit-report-dashboard.png';
import mobileViewImage from '../../../assets/landing/mobile-dashboard.png';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { useLanguage } from '../../../app/hooks/useLanguage';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Printer,
  ReceiptText,
  RefreshCcw,
  Route,
  ShoppingBag,
  Store,
  Truck,
  Warehouse,
  WalletCards,
} from 'lucide-react';

const demoEmail = 'demo@stockledger.live';
const demoPassword = 'Demo@12345';
const demoPhone = '01678560660';
const whatsappUrl = 'https://wa.me/8801678560660';

const navLinks = [
  { key: 'features', href: '#features' },
  { key: 'solutions', href: '#solutions' },
  { key: 'workflow', href: '#workflow' },
  { key: 'demo', href: '#demo' },
  { key: 'pricing', href: '#pricing' },
];

const featureStoryImages = [retailCounterImage, dsrSettlementImage, purchaseReceiveImage];

const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCcw, Printer];

const solutionIcons = [Store, PackageCheck, Truck, Route];
const solutionImages = [retailCounterImage, warehouseStockImage, ownerLaptopImage, dsrSettlementImage];

const workflowIcons = [Warehouse, Boxes, ReceiptText, WalletCards, BarChart3];

const showcaseImages = [
  { src: dueCollectionImage, key: 'dueCollection', fit: 'cover' },
  { src: profitReportImage, key: 'profitReport', fit: 'cover' },
  { src: mobileViewImage, key: 'mobileView', fit: 'contain' },
  { src: ownerLaptopImage, key: 'ownerLaptop', fit: 'cover' },
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
    <main className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <HeroSection t={t} />
      <ProblemSection t={t} />
      <FeatureStorySection t={t} />
      <FeatureGridSection t={t} />
      <SolutionsSection t={t} />
      <WorkflowSection t={t} />
      <ImageShowcaseSection t={t} />
      <DemoSection t={t} />
      <PricingSection t={t} />
      <LandingFooter t={t} />
    </main>
  );
}

function LandingHeader({ language, setLanguage, t }) {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <a href="#top" className="flex items-center gap-3" aria-label="StockLedger home">
          <span className="brand-mark">
            <Boxes size={20} />
          </span>
          <span>
            <span className="block text-lg font-black leading-none text-slate-950">StockLedger</span>
            <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">
              stockledger.live
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Landing navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="landing-nav-link">
              {t(`landing.nav.${link.key}`)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher language={language} onChange={setLanguage} t={t} compact />
          <Link to="/login" className="landing-small-cta">
            {t('landing.tryDemo')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ t }) {
  const heroImage = {
    src: heroDashboardImage,
    alt: t('landing.images.heroDashboard'),
  };

  return (
    <section id="top" className="landing-hero">
      <div className="landing-container landing-hero-layout">
        <div className="max-w-3xl">
          <p className="landing-eyebrow">{t('landing.hero.eyebrow')}</p>
          <h1 className="landing-hero-title">{t('landing.hero.title')}</h1>
          <p className="landing-hero-subtitle">{t('landing.hero.subtitle')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="landing-primary-btn">
              {t('landing.tryDemo')}
              <ArrowRight size={18} />
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="landing-secondary-btn">
              <MessageCircle size={18} />
              {t('landing.whatsappDemo')}
            </a>
          </div>

          <div className="landing-demo-strip">
            <CopyableField
              icon={Mail}
              label={t('landing.hero.demoEmailLabel')}
              value={demoEmail}
              wrapperClassName="flex w-full items-center gap-3 rounded-2xl bg-slate-50/90 p-3 text-left transition hover:bg-slate-100"
              iconClassName="landing-demo-icon"
            />
            <CopyableField
              icon={KeyRound}
              label={t('landing.hero.demoPasswordLabel')}
              value={demoPassword}
              wrapperClassName="flex w-full items-center gap-3 rounded-2xl bg-slate-50/90 p-3 text-left transition hover:bg-slate-100"
              iconClassName="landing-demo-icon"
            />
          </div>
        </div>

        <div className="landing-hero-media">
          <ImagePlaceholder data={heroImage} heightClass="h-[300px] sm:h-[380px] lg:h-[440px]" variant="dashboard" />
          <div className="landing-floating-note hidden md:block">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--brand-strong)]">{t('landing.hero.liveView')}</span>
            <p className="mt-2 text-sm font-bold leading-5 text-slate-700">{t('landing.hero.liveViewText')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection({ t }) {
  const problems = t('landing.problem.items');

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="problem-panel">
          <div>
            <p className="landing-eyebrow">{t('landing.problem.eyebrow')}</p>
            <h2 className="landing-section-title">{t('landing.problem.title')}</h2>
            <p className="landing-section-text">{t('landing.problem.text')}</p>
          </div>

          <div className="grid gap-3">
            {problems.map((item) => (
              <div key={item} className="problem-item">
                <CheckCircle2 size={18} className="text-[var(--success)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureStorySection({ t }) {
  const groups = t('landing.featureStory.groups');

  return (
    <section id="features" className="landing-section bg-white/60">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.featureStory.label')}
          title={t('landing.featureStory.title')}
          description={t('landing.featureStory.description')}
        />

        <div className="mt-10 space-y-8">
          {groups.map((group, index) => (
            <article key={group.title} className={`feature-story ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <ImagePlaceholder data={{ src: featureStoryImages[index], alt: group.title }} heightClass="h-[260px] sm:h-[320px]" />
              </div>
              <div className="feature-story-content">
                <h3 className="text-2xl font-black text-slate-950">{group.title}</h3>
                <div className="mt-6 space-y-4">
                  {group.items.map((item) => (
                    <p key={item} className="flex gap-3 text-sm font-bold leading-6 text-slate-700">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGridSection({ t }) {
  const featureCards = t('landing.featureCards');

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature, index) => {
            const Icon = featureCardIcons[index];
            return (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-icon">
                  <Icon size={21} />
                </span>
                <h3 className="mt-5 text-base font-black text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SolutionsSection({ t }) {
  const items = t('landing.solutions.items');

  return (
    <section id="solutions" className="landing-section bg-white/60">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.solutions.label')}
          title={t('landing.solutions.title')}
          description={t('landing.solutions.description')}
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {items.map((solution, index) => {
            const Icon = solutionIcons[index];
            return (
              <article key={solution.title} className="solution-card">
                <ImagePlaceholder data={{ src: solutionImages[index], alt: solution.title }} heightClass="h-48" />
                <div className="p-6">
                  <Icon size={28} className="text-[var(--brand)]" />
                  <h3 className="mt-5 text-xl font-black text-slate-950">{solution.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{solution.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection({ t }) {
  const steps = t('landing.workflow.steps');

  return (
    <section id="workflow" className="landing-section">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.workflow.label')}
          title={t('landing.workflow.title')}
          description={t('landing.workflow.description')}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = workflowIcons[index];
            return (
              <article key={step.title} className="workflow-card">
                <span className="workflow-number">{index + 1}</span>
                <Icon size={24} className="mt-5 text-[var(--brand)]" />
                <h3 className="mt-4 text-base font-black text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ImageShowcaseSection({ t }) {
  return (
    <section className="landing-section bg-white/60">
      <div className="landing-container">
        <div className="showcase-grid">
          <div>
            <p className="landing-eyebrow">{t('landing.showcase.eyebrow')}</p>
            <h2 className="landing-section-title">{t('landing.showcase.title')}</h2>
            <p className="landing-section-text">{t('landing.showcase.text')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {showcaseImages.map((image) => (
              <ImagePlaceholder
                key={image.key}
                data={{ src: image.src, alt: t(`landing.images.${image.key}`) }}
                heightClass="h-52"
                fit={image.fit}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoSection({ t }) {
  return (
    <section id="demo" className="landing-section">
      <div className="landing-container">
        <div className="demo-panel">
          <div>
            <p className="landing-eyebrow">{t('landing.demo.eyebrow')}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{t('landing.demo.title')}</h2>
            <p className="mt-4 text-base font-semibold leading-7 text-[var(--text-soft)]">{t('landing.demo.text', { phone: demoPhone })}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DemoInfo icon={Mail} label={t('landing.demo.emailLabel')} value={demoEmail} />
              <DemoInfo icon={KeyRound} label={t('landing.demo.passwordLabel')} value={demoPassword} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/login" className="demo-white-btn">
              {t('landing.tryDemo')}
              <ArrowRight size={18} />
            </Link>
            <a href={`tel:${demoPhone}`} className="demo-outline-btn">
              <Phone size={18} />
              {t('landing.demo.callNow')}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="demo-outline-btn">
              <MessageCircle size={18} />
              {t('landing.demo.whatsapp')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({ t }) {
  const plans = t('landing.pricing.plans');

  return (
    <section id="pricing" className="landing-section bg-white/60">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.pricing.label')}
          title={t('landing.pricing.title')}
          description={t('landing.pricing.description')}
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`pricing-card ${index === 1 ? 'pricing-card-featured' : ''}`}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand-strong)]">{plan.label}</p>
              <h3 className="mt-4 text-2xl font-black text-slate-950">{plan.name}</h3>
              <p className="mt-5 flex items-baseline gap-1 text-slate-950">
                <span className="text-3xl font-black">{plan.price}</span>
                {plan.cadence ? <span className="text-sm font-black text-slate-500">{plan.cadence}</span> : null}
              </p>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{plan.description}</p>
              <div className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <p key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={18} className="shrink-0 text-[var(--success)]" />
                    {item}
                  </p>
                ))}
              </div>
              <a href={`tel:${demoPhone}`} className={index === 1 ? 'btn-primary mt-8 w-full rounded-2xl' : 'btn-secondary mt-8 w-full rounded-2xl'}>
                {t('landing.pricing.contactDemo')}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ t }) {
  return (
    <footer id="contact" className="border-t border-slate-200 bg-white">
      <div className="landing-container grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-mark">
              <Boxes size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">StockLedger</h2>
              <p className="text-sm font-semibold text-slate-500">{t('landing.footer.tagline')}</p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-slate-600">{t('landing.footer.description')}</p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-sm font-bold text-slate-500">{t('landing.footer.contactLabel')}</p>
          <a href={`tel:${demoPhone}`} className="mt-1 block text-2xl font-black text-slate-950 hover:text-[var(--brand-strong)]">
            {demoPhone}
          </a>
          <p className="mt-4 text-sm font-semibold text-slate-500">{t('landing.footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}

function ImagePlaceholder({ data, heightClass, variant = 'photo', fit = 'cover' }) {
  return (
    <div className={`image-placeholder ${heightClass} ${variant === 'dashboard' ? 'image-placeholder-dashboard' : ''}`}>
      <img
        src={data.src}
        alt={data.alt}
        className={`landing-image ${fit === 'contain' ? 'landing-image-contain' : ''}`}
      />
    </div>
  );
}

function SectionHeader({ label, title, description }) {
  return (
    <div className="max-w-3xl">
      <p className="landing-eyebrow">{label}</p>
      <h2 className="landing-section-title">{title}</h2>
      <p className="landing-section-text">{description}</p>
    </div>
  );
}

function DemoInfo({ icon, label, value }) {
  return (
    <CopyableField
      icon={icon}
      label={label}
      value={value}
      wrapperClassName="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:border-blue-200 hover:bg-blue-50/40"
      iconClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"
      valueClassName="mt-0.5 block whitespace-nowrap text-base font-black text-slate-950"
    />
  );
}

function CopyableField({ icon: Icon, label, value, wrapperClassName, iconClassName, valueClassName }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors (e.g. unsupported browser)
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={`group ${wrapperClassName}`}>
      <span className={iconClassName}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="landing-demo-label">{label}</span>
        <strong className={valueClassName}>{value}</strong>
      </span>
      <span className={copied ? 'shrink-0 text-[var(--success)]' : 'shrink-0 text-slate-400 transition group-hover:text-[var(--brand-strong)]'}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </span>
    </button>
  );
}
