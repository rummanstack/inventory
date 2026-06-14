import { useEffect } from 'react';
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
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Languages,
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
  UsersRound,
  WalletCards,
  Warehouse,
} from 'lucide-react';

const demoEmail = 'demo@stockledger.live';
const demoPassword = 'Demo@12345';
const demoPhone = '01678560660';
const whatsappUrl = 'https://wa.me/8801678560660';

const imagePlaceholders = {
  heroDashboard: {
    src: heroDashboardImage,
    alt: 'StockLedger dashboard screenshot showing sales, stock, due and profit reports',
    note: 'Replace this import with a real StockLedger dashboard screenshot.',
  },
  ownerLaptop: {
    src: ownerLaptopImage,
    alt: 'Business owner checking stock and sales reports on laptop',
    note: 'Replace this import with dealer or wholesaler owner using StockLedger.',
  },
  retailCounter: {
    src: retailCounterImage,
    alt: 'Retail shop staff making a quick sale using laptop or tablet',
    note: 'Replace this import with retail counter quick sale photo.',
  },
  warehouseStock: {
    src: warehouseStockImage,
    alt: 'Warehouse staff checking product stock',
    note: 'Replace this import with warehouse or shop stock checking photo.',
  },
  dsrSettlement: {
    src: dsrSettlementImage,
    alt: 'DSR salesman submitting daily settlement to business owner',
    note: 'Replace this import with DSR/salesman settlement photo.',
  },
  purchaseReceive: {
    src: purchaseReceiveImage,
    alt: 'Supplier delivery products being received and entered into system',
    note: 'Replace this import with supplier purchase receive photo.',
  },
  dueCollection: {
    src: dueCollectionImage,
    alt: 'Business owner checking customer due and payment record',
    note: 'Replace this import with customer due collection photo.',
  },
  profitReport: {
    src: profitReportImage,
    alt: 'Business owner reviewing daily sales and profit dashboard',
    note: 'Replace this import with profit report/dashboard photo.',
  },
  mobileView: {
    src: mobileViewImage,
    alt: 'StockLedger responsive software view on tablet or mobile',
    note: 'Replace this import with software opened on phone or tablet.',
  },
};

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Demo', href: '#demo' },
  { label: 'Pricing', href: '#pricing' },
];

const mainFeatureGroups = [
  {
    title: 'Retail & Counter Sales',
    image: imagePlaceholders.retailCounter,
    items: [
      'Fast Quick Sale for single or multiple products',
      'Retail and wholesale invoice support',
      'Paid, partial paid and due sale tracking',
      'Instant stock update and receipt print',
    ],
  },
  {
    title: 'Dealer & DSR Operations',
    image: imagePlaceholders.dsrSettlement,
    items: [
      'Morning product issue to DSR/salesman',
      'Evening settlement with return, damage, cash and due',
      'Route sales and salesman-wise reporting',
      'Clear daily settlement records',
    ],
  },
  {
    title: 'Purchase, Stock & Supplier Control',
    image: imagePlaceholders.purchaseReceive,
    items: [
      'Supplier profile and purchase receive',
      'Stock increase from purchase entries',
      'Supplier due and payment history',
      'Product stock and movement tracking',
    ],
  },
];

const featureCards = [
  {
    title: 'Retailer Quick Sale',
    description: 'Sell fast from the counter, print receipt, update stock and record payment instantly.',
    icon: ShoppingBag,
  },
  {
    title: 'Sales Invoice',
    description: 'Create clean invoices for retail, wholesale and direct customer sales.',
    icon: ReceiptText,
  },
  {
    title: 'Customer Due',
    description: 'Track previous due, new due, payment collection and current balance.',
    icon: WalletCards,
  },
  {
    title: 'Supplier Purchase',
    description: 'Receive products, update stock, record supplier bill and track payable amount.',
    icon: Warehouse,
  },
  {
    title: 'Stock Management',
    description: 'Keep product stock connected with sales, purchase, return and damage records.',
    icon: Boxes,
  },
  {
    title: 'Profit Reports',
    description: 'See daily sales, cost, profit, expenses and business summary from reports.',
    icon: BarChart3,
  },
  {
    title: 'Sales Return',
    description: 'Handle customer returns and keep stock, due and profit records accurate.',
    icon: RefreshCcw,
  },
  {
    title: 'Print & PDF',
    description: 'Print invoices, receipts, statements, settlement sheets and reports.',
    icon: Printer,
  },
];

const solutions = [
  {
    title: 'Retail Shops',
    description: 'Quick sale, receipt print, customer due, stock and daily profit in one simple flow.',
    icon: Store,
    image: imagePlaceholders.retailCounter,
  },
  {
    title: 'Wholesalers',
    description: 'Sales invoices, supplier purchases, customer balances and stock reports for wholesale teams.',
    icon: PackageCheck,
    image: imagePlaceholders.warehouseStock,
  },
  {
    title: 'Dealers & Distributors',
    description: 'Manage stock, route sales, DSR settlement, purchase and due collection.',
    icon: Truck,
    image: imagePlaceholders.ownerLaptop,
  },
  {
    title: 'DSR/Salesman Businesses',
    description: 'Give products to salesmen, collect return/cash, and close the day with clear settlement.',
    icon: Route,
    image: imagePlaceholders.dsrSettlement,
  },
];

const workflow = [
  {
    title: 'Purchase Receive',
    description: 'Record supplier delivery and purchase cost.',
    icon: Warehouse,
  },
  {
    title: 'Stock Update',
    description: 'Stock increases or decreases automatically.',
    icon: Boxes,
  },
  {
    title: 'Sales / Settlement',
    description: 'Create invoice, quick sale or DSR settlement.',
    icon: ReceiptText,
  },
  {
    title: 'Due Collection',
    description: 'Track customer and supplier balances.',
    icon: WalletCards,
  },
  {
    title: 'Profit Report',
    description: 'Check daily sales, profit and business result.',
    icon: BarChart3,
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    label: 'For small shops',
    price: 'BDT 499',
    cadence: '/month',
    description: 'Simple stock, quick sale, customer due and daily report setup.',
    items: ['Quick Sale', 'Product Stock', 'Customer Due', 'Daily Report'],
  },
  {
    name: 'Business',
    label: 'Most popular',
    price: 'BDT 999',
    cadence: '/month',
    description: 'Best for dealers, wholesalers and distributors with sales and purchase flow.',
    items: ['Sales Invoice', 'Purchase Receive', 'Supplier Due', 'DSR Settlement'],
    featured: true,
  },
  {
    name: 'Custom',
    label: 'For growing teams',
    price: 'Custom setup',
    cadence: '',
    description: 'For businesses that need team training, custom setup or extra reports.',
    items: ['Custom Onboarding', 'Training', 'Advanced Reports', 'Priority Support'],
  },
];

export default function LandingPage() {
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
      <LandingHeader />
      <HeroSection />
      <ProblemSection />
      <FeatureStorySection />
      <FeatureGridSection />
      <SolutionsSection />
      <WorkflowSection />
      <ImageShowcaseSection />
      <DemoSection />
      <PricingSection />
      <LandingFooter />
    </main>
  );
}

function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="landing-container flex min-h-16 items-center justify-between gap-4">
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
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href={`tel:${demoPhone}`} className="hidden rounded-full px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 sm:inline-flex">
            {demoPhone}
          </a>
          <Link to="/login" className="landing-small-cta">
            Try Demo
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section id="top" className="landing-hero">
      <div className="landing-container landing-hero-layout">
        <div className="max-w-3xl">
          <p className="landing-eyebrow">Dealer, Wholesale & Retail Business Management Software</p>
          <h1 className="landing-hero-title">
            Stock, sales, due and profit management for real trading businesses.
          </h1>
          <p className="landing-hero-subtitle">
            StockLedger helps retailers, wholesalers, dealers and DSR-based businesses manage quick sales, invoices,
            purchases, customer due, supplier due, settlement and reports without depending on notebooks or Excel.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="landing-primary-btn">
              Try Demo
              <ArrowRight size={18} />
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="landing-secondary-btn">
              <MessageCircle size={18} />
              WhatsApp Demo
            </a>
          </div>

          <div className="landing-demo-strip">
            <div>
              <span className="text-slate-500">Demo Email</span>
              <strong>{demoEmail}</strong>
            </div>
            <div>
              <span className="text-slate-500">Password</span>
              <strong>{demoPassword}</strong>
            </div>
            <div>
              <span className="text-slate-500">Call</span>
              <strong>{demoPhone}</strong>
            </div>
          </div>
        </div>

        <div className="landing-hero-media">
          <ImagePlaceholder data={imagePlaceholders.heroDashboard} heightClass="h-[360px] sm:h-[440px]" variant="dashboard" />
          <div className="landing-floating-note hidden md:block">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--brand-strong)]">Live view</span>
            <p className="mt-2 text-sm font-bold leading-5 text-slate-700">
              Owner-friendly dashboard for sales, stock, due and profit at a glance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    'Stock mismatch after sales, returns and purchases',
    'Customer due written in notebook and hard to collect',
    'DSR settlement takes too much time every evening',
    'Owner cannot quickly see daily profit and business status',
  ];

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="problem-panel">
          <div>
            <p className="landing-eyebrow">Why StockLedger</p>
            <h2 className="landing-section-title">Designed for businesses that sell products every day.</h2>
            <p className="landing-section-text">
              Many local businesses lose time because sales, stock, due, purchase and settlement stay in different
              notebooks or Excel files. StockLedger keeps these daily records connected.
            </p>
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

function FeatureStorySection() {
  return (
    <section id="features" className="landing-section bg-white/60">
      <div className="landing-container">
        <SectionHeader
          label="Main Features"
          title="A complete daily workflow, not just stock entry"
          description="Use the same system for counter sale, wholesale invoice, purchase receive, DSR settlement and profit reporting."
        />

        <div className="mt-10 space-y-8">
          {mainFeatureGroups.map((group, index) => (
            <article key={group.title} className={`feature-story ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <ImagePlaceholder data={group.image} heightClass="h-[280px] sm:h-[340px]" />
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

function FeatureGridSection() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
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

function SolutionsSection() {
  return (
    <section id="solutions" className="landing-section bg-white/60">
      <div className="landing-container">
        <SectionHeader
          label="Who is it for?"
          title="One system for shops, wholesalers and route sales teams"
          description="Keep the daily workflow focused for each business type, from counter sale to wholesale invoice and route settlement."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {solutions.map((solution) => {
            const Icon = solution.icon;
            return (
              <article key={solution.title} className="solution-card">
                <ImagePlaceholder data={solution.image} heightClass="h-48" compact />
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

function WorkflowSection() {
  return (
    <section id="workflow" className="landing-section">
      <div className="landing-container">
        <SectionHeader
          label="Real Business Workflow"
          title="From purchase to profit report"
          description="The workflow follows how trading businesses already operate every day."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          {workflow.map((step, index) => {
            const Icon = step.icon;
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

function ImageShowcaseSection() {
  const images = [
    imagePlaceholders.dueCollection,
    imagePlaceholders.profitReport,
    imagePlaceholders.mobileView,
    imagePlaceholders.ownerLaptop,
  ];

  return (
    <section className="landing-section bg-white/60">
      <div className="landing-container">
        <div className="showcase-grid">
          <div>
            <p className="landing-eyebrow">Business-ready view</p>
            <h2 className="landing-section-title">Works across counter, office, warehouse and mobile.</h2>
            <p className="landing-section-text">
              StockLedger keeps the same business records connected whether your team is selling from the counter,
              receiving supplier stock, collecting due or reviewing profit reports.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((image) => (
              <ImagePlaceholder key={image.src} data={image} heightClass="h-52" compact />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section id="demo" className="landing-section">
      <div className="landing-container">
        <div className="demo-panel">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">Try Demo</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">
              Check the system with demo data before taking a walkthrough.
            </h2>
            <p className="mt-4 text-base font-semibold leading-7 text-blue-100">
              Use the demo login or call {demoPhone}. Demo data should be separate from real customer data.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DemoInfo label="Demo Email" value={demoEmail} />
              <DemoInfo label="Demo Password" value={demoPassword} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/login" className="demo-white-btn">
              Try Demo
              <ArrowRight size={18} />
            </Link>
            <a href={`tel:${demoPhone}`} className="demo-outline-btn">
              <Phone size={18} />
              Call Now
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="demo-outline-btn">
              <MessageCircle size={18} />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="landing-section bg-white/60">
      <div className="landing-container">
        <SectionHeader
          label="Pricing"
          title="Start simple, then expand as your business grows"
          description="Keep pricing flexible while you are onboarding the first customers. Show clear plan direction without forcing online checkout."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article key={plan.name} className={`pricing-card ${plan.featured ? 'pricing-card-featured' : ''}`}>
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
              <a href={`tel:${demoPhone}`} className={plan.featured ? 'btn-primary mt-8 w-full rounded-2xl' : 'btn-secondary mt-8 w-full rounded-2xl'}>
                Contact for Demo
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
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
              <p className="text-sm font-semibold text-slate-500">Dealer, Wholesale & Retail Business Management Software</p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-slate-600">
            Manage stock, quick sales, invoices, customer due, supplier purchase, DSR settlement, profit and reports from one simple system.
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-sm font-bold text-slate-500">Contact</p>
          <a href={`tel:${demoPhone}`} className="mt-1 block text-2xl font-black text-slate-950 hover:text-[var(--brand-strong)]">
            {demoPhone}
          </a>
          <p className="mt-4 text-sm font-semibold text-slate-500">Copyright &copy; 2026 StockLedger. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function ImagePlaceholder({ data, heightClass, variant = 'photo', compact = false }) {
  return (
    <div className={`image-placeholder ${heightClass} ${variant === 'dashboard' ? 'image-placeholder-dashboard' : ''}`}>
      {/* Temporary generated image. Replace the imported image source for this item when real screenshots/photos are ready. */}
      <img src={data.src} alt={data.alt} className="landing-image" />
      <div className={compact ? 'landing-image-caption landing-image-caption-compact' : 'landing-image-caption'}>
        <p>{compact ? data.alt.replace('StockLedger ', '') : data.alt}</p>
      </div>
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

function DemoInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">{label}</p>
      <p className="mt-2 text-base font-black text-white">{value}</p>
    </div>
  );
}
