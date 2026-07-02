import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Facebook,
  Globe,
  Heart,
  Lightbulb,
  Linkedin,
  MessageCircle,
  Phone,
  Quote,
  Rocket,
  Send,
  Shield,
  Twitter,
  Users,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import { contactPhone, whatsappUrl } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

// ── Replace this import with the founder's real photo when ready ──
import founderPhoto from '../../../assets/landing/business-owner.png';

const FOUNDER = {
  name: 'Rumman',
  title: 'Founder & CEO, StockLedger',
  location: 'Dhaka, Bangladesh',
  tagline: 'Building software that actually works for Bangladeshi businesses.',
  social: {
    linkedin: '#',
    twitter: '#',
    facebook: '#',
    telegram: '#',
  },
};

const TIMELINE = [
  {
    year: '2020',
    title: 'The Problem Becomes Clear',
    body: 'While working closely with small and medium business owners across Bangladesh, I kept seeing the same pain — stock managed in worn notebooks, DSR settlements done on phone calls, and profit calculated by gut feeling. Something had to change.',
  },
  {
    year: '2021',
    title: 'First Lines of Code',
    body: 'I started building a simple inventory tool for a single shop owner. Within weeks, three more businesses wanted it. That was the signal: this wasn\'t a niche problem — it was universal.',
  },
  {
    year: '2022',
    title: 'Going Multi-Tenant',
    body: 'The architecture evolved from a single-business tool into a full multi-tenant SaaS. Features like DSR morning issue, evening settlements, supplier due ledgers, and retail POS were shaped directly by real merchants telling us what they needed.',
  },
  {
    year: '2023',
    title: 'StockLedger is Born',
    body: 'The platform launched under the StockLedger brand. Businesses across Dhaka, Chittagong, Sylhet, and Rajshahi started onboarding. Customer feedback drove a wave of new features: serial tracking, warranty claims, finance accounts, profit reports.',
  },
  {
    year: '2024 →',
    title: 'Scaling the Vision',
    body: 'Today, StockLedger serves dozens of tenants — grocery wholesalers, electronics retailers, pharmacies, FMCG distributors. The mission is unchanged: give every Bangladeshi business owner the financial clarity and operational control they deserve.',
  },
];

const VALUES = [
  {
    Icon: Heart,
    title: 'Built with empathy',
    body: 'Every feature starts with a real conversation with a real business owner. Software should fit the user, not the other way around.',
  },
  {
    Icon: Shield,
    title: 'Trustworthy by design',
    body: 'Your data belongs to you. Multi-tenant isolation, audit trails, and secure sessions aren\'t afterthoughts — they\'re foundational.',
  },
  {
    Icon: Zap,
    title: 'Relentlessly practical',
    body: 'No bloat. No feature you\'ll never use. Every screen is designed to save time for someone who has too little of it.',
  },
  {
    Icon: Lightbulb,
    title: 'Continuously improving',
    body: 'The best version of StockLedger is always the next one. Feedback loops are short, releases are frequent, and nothing is set in stone.',
  },
  {
    Icon: Users,
    title: 'Community-first',
    body: 'StockLedger grows because the businesses that use it grow. When our users win, we win.',
  },
  {
    Icon: Globe,
    title: 'Made in Bangladesh, for Bangladesh',
    body: 'We understand the local business context — the way DSR distribution works, how supplier credit flows, what matters in a Bangladeshi P&L.',
  },
];

const STATS = [
  { value: '3+',  label: 'Years building' },
  { value: '50+', label: 'Businesses served' },
  { value: '8+',  label: 'Industry verticals' },
  { value: '∞',   label: 'Cups of tea' },
];

export default function FounderPage() {
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
    <main className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden pb-0 pt-28 sm:pt-36"
        style={{
          background: 'linear-gradient(160deg, var(--bg-dark) 0%, #1a1048 50%, #0d1f3c 100%)',
        }}
      >
        {/* Decorative glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/3 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[var(--brand)] opacity-10 blur-[140px]" />
          <div className="absolute right-0 top-1/2 h-[300px] w-[300px] rounded-full bg-teal-500 opacity-8 blur-[100px]" />
        </div>
        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="landing-container relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link to="/landing" className="transition hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-slate-300">About the Founder</span>
          </div>

          {/* Hero layout */}
          <div className="mt-10 flex flex-col items-center gap-10 pb-0 lg:flex-row lg:items-end lg:gap-16">

            {/* Copy */}
            <div className="max-w-xl lg:pb-16">
              <span className="landing-eyebrow !text-[var(--teal)]">About the Founder</span>
              <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                {FOUNDER.name}
              </h1>
              <p className="mt-2 text-base font-bold text-[var(--teal)]">{FOUNDER.title}</p>
              <p className="mt-5 text-base font-medium leading-7 text-slate-300 sm:text-lg">
                {FOUNDER.tagline}
              </p>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STATS.map(({ value, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-center backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Social links */}
              <div className="mt-7 flex items-center gap-2">
                {[
                  { href: FOUNDER.social.linkedin, Icon: Linkedin, label: 'LinkedIn' },
                  { href: FOUNDER.social.twitter,  Icon: Twitter,  label: 'Twitter' },
                  { href: FOUNDER.social.facebook,  Icon: Facebook, label: 'Facebook' },
                  { href: FOUNDER.social.telegram,  Icon: Send,     label: 'Telegram' },
                ].map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20"
                  >
                    <Icon size={16} />
                  </a>
                ))}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-flex h-10 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 text-sm font-bold text-emerald-300 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-500/25"
                >
                  <MessageCircle size={15} />
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Photo card — sits at the bottom of the hero, half-overlapping the body */}
            <div className="relative shrink-0 self-end">
              {/* Glow behind photo */}
              <div className="absolute inset-0 -m-6 rounded-full bg-[var(--brand)] opacity-20 blur-[60px]" />

              {/* Photo frame */}
              <div
                className="relative h-[340px] w-[280px] overflow-hidden rounded-[32px] sm:h-[400px] sm:w-[320px]"
                style={{
                  background: 'linear-gradient(145deg,var(--brand),var(--brand-strong) 40%,var(--teal))',
                  padding: '3px',
                }}
              >
                <div className="h-full w-full overflow-hidden rounded-[29px] bg-slate-800">
                  {/* ── PLACEHOLDER PHOTO — replace src when ready ── */}
                  <img
                    src={founderPhoto}
                    alt={`${FOUNDER.name} — Founder of StockLedger`}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/95 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))]">
                  <img loading="lazy" decoding="async" src={stockLedgerLogoIcon} alt="" className="h-5 w-5 object-contain" />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-950">StockLedger</p>
                  <p className="text-[10px] font-semibold text-slate-500">{FOUNDER.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pullquote ── */}
      <section className="border-b border-slate-100 bg-[linear-gradient(180deg,#f8f7ff_0%,#ffffff_100%)]">
        <div className="landing-container py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Quote size={36} className="mx-auto text-[var(--brand)]/30" />
            <blockquote className="mt-4 text-xl font-bold leading-8 text-slate-800 sm:text-2xl sm:leading-9">
              "Every business owner in Bangladesh deserves the same financial clarity that big corporations have.
              I built StockLedger so that a shop in Sylhet can run as tightly as a company in Singapore."
            </blockquote>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[var(--brand)]">
              — {FOUNDER.name}, Founder
            </p>
          </div>
        </div>
      </section>

      {/* ── Story + Timeline ── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="grid gap-16 lg:grid-cols-[1fr_minmax(0,1.1fr)]">

            {/* Left — story intro */}
            <div>
              <p className="landing-eyebrow">The story</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                Why I Built This
              </h2>
              <div className="mt-6 space-y-5 text-[15px] leading-7 text-slate-600">
                <p>
                  Bangladesh has millions of small and medium businesses — grocery wholesalers, electronics
                  distributors, pharmacy chains, FMCG traders. They move serious money every day, but most of
                  them still manage their operations through WhatsApp messages, paper ledgers, and mental
                  arithmetic.
                </p>
                <p>
                  I've sat across from these business owners. I've seen the 11 PM phone calls chasing DSR cash,
                  the end-of-month panic when supplier dues don't match, the guesswork where profit should be.
                  These aren't small problems — they compound into missed growth, broken trust, and lost sleep.
                </p>
                <p>
                  StockLedger exists because I believe the right software, designed specifically for how
                  Bangladeshi distribution and retail actually works, can give these owners their time back —
                  and their confidence back.
                </p>
                <p>
                  It's not a generic ERP adapted for here. It's built from the ground up for morning issue,
                  evening settlement, DSR due ledgers, supplier credit, case-and-piece inventory, and
                  every other workflow that's specific to this market.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-primary-btn !bg-[#25D366] !shadow-[0_16px_32px_rgba(37,211,102,0.28)] hover:!bg-[#1ebe5d]"
                >
                  <MessageCircle size={18} />
                  Talk to me on WhatsApp
                </a>
                <Link to="/login" className="landing-secondary-btn">
                  Try StockLedger
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Right — timeline */}
            <div>
              <p className="landing-eyebrow">The journey</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
                From Idea to Platform
              </h2>
              <div className="mt-8 space-y-0">
                {TIMELINE.map(({ year, title, body }, index) => (
                  <div key={year} className="flex gap-5">
                    {/* Spine */}
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-[0_8px_20px_rgba(var(--blue-700),0.28)]"
                        style={{
                          background: 'linear-gradient(135deg,var(--brand),var(--brand-strong))',
                        }}
                      >
                        {index + 1}
                      </div>
                      {index < TIMELINE.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-gradient-to-b from-[var(--brand)]/30 to-transparent" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={index < TIMELINE.length - 1 ? 'pb-8' : 'pb-0'}>
                      <span className="inline-block rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[var(--brand-strong)]">
                        {year}
                      </span>
                      <h3 className="mt-2 font-black text-slate-950">{title}</h3>
                      <p className="mt-1.5 text-[14px] leading-6 text-slate-600">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="text-center">
            <p className="landing-eyebrow">What I believe</p>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              The Principles Behind StockLedger
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-slate-600">
              These aren't company values written for a slide deck. They're the actual decisions I make
              every day when building this product.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-[22px] border border-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(var(--blue-700),0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(var(--blue-700),0.1)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
                  <Icon size={20} className="text-[var(--brand-strong)]" />
                </span>
                <h3 className="mt-4 font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Personal note / CTA ── */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,var(--brand-strong)_0%,#1a1048_55%,#0d1f3c_100%)] p-8 sm:p-12 lg:p-16">
            {/* Decorative glows */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--brand)] opacity-15 blur-[80px]" />
              <div className="absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-teal-500 opacity-10 blur-[60px]" />
            </div>

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-14">
              {/* Photo — small, circular */}
              <div className="shrink-0">
                <div
                  className="h-24 w-24 overflow-hidden rounded-full sm:h-28 sm:w-28"
                  style={{
                    background: 'linear-gradient(135deg,var(--brand),var(--teal))',
                    padding: '2px',
                  }}
                >
                  <img
                    src={founderPhoto}
                    alt={FOUNDER.name}
                    className="h-full w-full rounded-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="flex-1">
                <p className="landing-eyebrow !text-[var(--teal)]">A personal note</p>
                <p className="mt-3 text-lg font-bold leading-7 text-white sm:text-xl">
                  If you're a business owner who's been managing stock in notebooks, tracking dues on
                  WhatsApp, and lying awake wondering if you made money this month — I built this for you.
                  I'd love to talk. Reach out anytime.
                </p>
                <p className="mt-3 text-sm font-bold text-[var(--teal)]">— {FOUNDER.name}</p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-col gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(37,211,102,0.3)] transition hover:-translate-y-0.5"
                >
                  <MessageCircle size={16} />
                  WhatsApp me
                </a>
                <a
                  href={`tel:${contactPhone}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <Phone size={16} />
                  {contactPhone}
                </a>
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[var(--brand-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5"
                >
                  Try StockLedger
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}
