import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Clock,
  FileText,
  Gavel,
  Globe,
  KeyRound,
  MessageCircle,
  Phone,
  Scale,
  ShieldOff,
  Trash2,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import { contactPhone, whatsappUrl } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

const LAST_UPDATED = 'June 29, 2026';
const COMPANY_NAME = 'StockLedger (Arinda)';
const COMPANY_EMAIL = 'legal@stockledger.com.bd';

const SECTIONS = [
  { id: 'acceptance',       label: 'Acceptance of Terms',        Icon: BadgeCheck },
  { id: 'service',          label: 'Description of Service',     Icon: BookOpen },
  { id: 'accounts',         label: 'Accounts & Security',        Icon: KeyRound },
  { id: 'subscription',     label: 'Subscription & Payment',     Icon: Wallet },
  { id: 'acceptable-use',   label: 'Acceptable Use',             Icon: UserCheck },
  { id: 'data-ownership',   label: 'Data & Ownership',           Icon: FileText },
  { id: 'ip',               label: 'Intellectual Property',      Icon: Globe },
  { id: 'disclaimers',      label: 'Warranties & Disclaimers',   Icon: ShieldOff },
  { id: 'liability',        label: 'Limitation of Liability',    Icon: Scale },
  { id: 'termination',      label: 'Termination',                Icon: Trash2 },
  { id: 'governing-law',    label: 'Governing Law',              Icon: Gavel },
  { id: 'contact',          label: 'Contact Us',                 Icon: MessageCircle },
];

function SectionAnchor({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand-soft),color-mix(in_srgb,var(--teal)_12%,white))]">
          <Icon size={18} className="text-[var(--brand-strong)]" />
        </span>
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
      </div>
      <div className="space-y-4 text-[15px] leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoCard({ tone = 'blue', children }) {
  const tones = {
    blue:  'border-blue-100 bg-blue-50/70 text-blue-900',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-900',
    rose:  'border-rose-100 bg-rose-50/70 text-rose-900',
    teal:  'border-teal-100 bg-teal-50/70 text-teal-900',
  };
  return (
    <div className={`rounded-2xl border px-5 py-4 text-[14px] font-medium leading-6 ${tones[tone]}`}>
      {children}
    </div>
  );
}

function DefList({ items }) {
  return (
    <dl className="space-y-4">
      {items.map(({ term, def }) => (
        <div key={term} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <dt className="font-black text-slate-950">{term}</dt>
          <dd className="mt-1 text-[14px] text-slate-600">{def}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function TermsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState('acceptance');
  const contentRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40"
        style={{
          background: 'linear-gradient(145deg, #0c0b1e 0%, #12103a 45%, #0d2040 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-[460px] w-[460px] rounded-full bg-indigo-600 opacity-10 blur-[130px]" />
          <div className="absolute -left-16 bottom-0 h-[280px] w-[280px] rounded-full bg-[var(--teal)] opacity-8 blur-[90px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="landing-container relative">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link to="/landing" className="transition hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Terms &amp; Conditions</span>
          </div>

          <div className="mt-6 max-w-2xl">
            <span className="landing-eyebrow !text-[var(--teal)]">Legal</span>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl">
              Terms &amp; Conditions
            </h1>
            <p className="mt-4 text-base font-medium leading-7 text-slate-300 sm:text-lg">
              Please read these terms carefully before using StockLedger. By accessing our platform
              you agree to be bound by the conditions outlined below.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300">
              <Clock size={14} className="text-teal-400" />
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="landing-container py-12 lg:py-16">
        <div className="lg:flex lg:gap-14 xl:gap-20">

          {/* Sticky TOC */}
          <aside className="hidden lg:block lg:w-56 xl:w-64 shrink-0">
            <nav className="sticky top-28 space-y-0.5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">On this page</p>
              {SECTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition duration-150 ${
                    activeSection === id
                      ? 'bg-[var(--brand-soft)] text-[var(--brand-strong)]'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <article ref={contentRef} className="min-w-0 flex-1 space-y-14">

            {/* 1 */}
            <SectionAnchor id="acceptance" icon={BadgeCheck} title="Acceptance of Terms">
              <p>
                These Terms &amp; Conditions ("Terms") govern your access to and use of the{' '}
                <strong className="font-black text-slate-900">{COMPANY_NAME}</strong> platform, including all
                associated websites, mobile interfaces, APIs, and related services (collectively, the "Service").
              </p>
              <p>
                By creating an account, subscribing to a plan, or otherwise using the Service, you confirm that
                you have read, understood, and agree to be bound by these Terms on behalf of yourself and, where
                applicable, the business entity you represent ("Tenant").
              </p>
              <InfoCard tone="amber">
                <strong>If you do not agree</strong> with any part of these Terms, you must not use the Service.
                Continued use after any update to these Terms constitutes acceptance of the revised version.
              </InfoCard>
              <p>
                These Terms should be read alongside our{' '}
                <Link to="/privacy-policy" className="font-semibold text-[var(--brand)] hover:underline">Privacy Policy</Link>,
                which is incorporated by reference.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 2 */}
            <SectionAnchor id="service" icon={BookOpen} title="Description of Service">
              <p>
                StockLedger is a cloud-based, multi-tenant software-as-a-service (SaaS) platform that provides:
              </p>
              <BulletList items={[
                'Inventory and stock management (products, categories, stock movements, damaged stock).',
                'Retail point-of-sale (POS) with sales invoices, returns, and customer due ledgers.',
                'Dealer/DSR (Delivery Sales Rep) distribution management including morning issue and evening settlements.',
                'Purchasing and supplier management with due ledgers.',
                'Finance management: accounts, transfers, expenses, and profit reports.',
                'Platform administration: tenant management, user roles, audit trails, and system health.',
              ]} />
              <p>
                We reserve the right to modify, suspend, or discontinue any part of the Service at any time with
                reasonable notice. We are not liable to you or any third party for any modification, suspension, or
                discontinuance.
              </p>
              <InfoCard tone="teal">
                Feature availability may vary by subscription tier and business type. Some features (e.g., batch
                tracking for pharmacies, serial tracking for electronics) are only enabled for eligible tenants.
              </InfoCard>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 3 */}
            <SectionAnchor id="accounts" icon={KeyRound} title="Accounts & Security">
              <p>
                To use the Service, your business must be registered as a Tenant and each individual must hold a
                User account. The following conditions apply:
              </p>
              <DefList items={[
                {
                  term: 'Eligibility',
                  def: 'You must be at least 18 years old and legally capable of entering into a binding contract. By registering, you represent that you meet these requirements.',
                },
                {
                  term: 'Accurate information',
                  def: 'You agree to provide truthful, current, and complete information during registration and to keep it up to date.',
                },
                {
                  term: 'Account credentials',
                  def: 'You are responsible for maintaining the confidentiality of your login credentials. You must notify us immediately at the contact details below if you suspect unauthorized access.',
                },
                {
                  term: 'Account responsibility',
                  def: 'You are responsible for all activities that occur under your account or Tenant. StockLedger is not liable for any loss arising from unauthorized use of your credentials.',
                },
                {
                  term: 'One account per user',
                  def: 'Each user must have their own account. Sharing credentials between multiple individuals is prohibited.',
                },
              ]} />
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 4 */}
            <SectionAnchor id="subscription" icon={Wallet} title="Subscription & Payment">
              <p>
                Access to the Service is offered on a subscription basis. By subscribing you agree to the
                following:
              </p>
              <BulletList items={[
                'Subscription fees are billed in advance on a monthly or annual cycle as selected at sign-up.',
                'All fees are quoted in Bangladeshi Taka (BDT) unless otherwise stated.',
                'Payment must be made via the accepted methods listed on the pricing page (mobile banking, bank transfer, etc.).',
                'Subscriptions automatically renew unless cancelled before the renewal date.',
                'We reserve the right to change pricing with at least 30 days prior written notice.',
                'Fees paid are non-refundable except where required by applicable law or as expressly stated in writing.',
              ]} />
              <InfoCard tone="rose">
                <strong>Late or failed payments</strong> may result in suspension of access to the Service. Data
                associated with a suspended account is retained for 90 days before permanent deletion.
              </InfoCard>
              <p>
                If you believe you have been billed incorrectly, contact us within 30 days of the charge at{' '}
                <a href={`mailto:${COMPANY_EMAIL}`} className="font-semibold text-[var(--brand)] hover:underline">{COMPANY_EMAIL}</a>.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 5 */}
            <SectionAnchor id="acceptable-use" icon={UserCheck} title="Acceptable Use">
              <p>
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You
                must not:
              </p>
              <BulletList items={[
                'Use the Service to store, transmit, or process any data that is illegal, fraudulent, defamatory, or infringes the rights of any third party.',
                'Attempt to gain unauthorized access to any part of the Service, other tenant accounts, or connected systems.',
                'Reverse-engineer, decompile, or disassemble any portion of the Service or its underlying software.',
                'Use automated scripts, bots, or crawlers to extract data from the Service without written permission.',
                'Resell, sublicense, or otherwise commercially exploit access to the Service without our express written consent.',
                'Upload or transmit malicious code, viruses, or anything designed to disrupt the Service or other users.',
                'Misrepresent your identity or affiliation with any person or organization.',
              ]} />
              <p>
                Violation of this section may result in immediate suspension or termination of your account, at
                our sole discretion, without refund.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 6 */}
            <SectionAnchor id="data-ownership" icon={FileText} title="Data & Ownership">
              <p>
                The following principles govern data ownership and processing within the platform:
              </p>
              <DefList items={[
                {
                  term: 'Your data is yours',
                  def: 'All business data you input into the Service — including products, customers, invoices, and financial records — remains your property at all times. We do not claim ownership over Tenant data.',
                },
                {
                  term: 'Data processing license',
                  def: 'By using the Service, you grant StockLedger a limited, non-exclusive license to process, store, and display your data solely for the purpose of providing the Service to you.',
                },
                {
                  term: 'Data export',
                  def: 'You may export your data at any time via the platform\'s export features (Excel, PDF). Upon termination, you have 90 days to request a full export before data deletion.',
                },
                {
                  term: 'Tenant isolation',
                  def: 'Data belonging to one Tenant is logically isolated from all others. We do not share your data with other tenants under any circumstances.',
                },
                {
                  term: 'Platform-generated data',
                  def: 'Aggregated, anonymized usage statistics derived from your use of the Service may be used by StockLedger to improve the platform. This data cannot be traced back to you or your business.',
                },
              ]} />
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 7 */}
            <SectionAnchor id="ip" icon={Globe} title="Intellectual Property">
              <p>
                The Service and all its contents — including software, design, text, graphics, logos, interfaces,
                and underlying code — are the exclusive property of {COMPANY_NAME} and its licensors, protected by
                copyright, trademark, and other intellectual property laws.
              </p>
              <BulletList items={[
                'The StockLedger name, logo, and brand marks are trademarks of Arinda. You may not use them without written permission.',
                'Nothing in these Terms transfers any intellectual property rights to you.',
                'Any feedback, suggestions, or ideas you provide may be used by us to improve the Service without obligation or compensation to you.',
                'Open-source components used within the platform remain subject to their respective licenses.',
              ]} />
              <p>
                If you believe any content on the platform infringes your intellectual property rights, please
                notify us at{' '}
                <a href={`mailto:${COMPANY_EMAIL}`} className="font-semibold text-[var(--brand)] hover:underline">{COMPANY_EMAIL}</a>.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 8 */}
            <SectionAnchor id="disclaimers" icon={ShieldOff} title="Warranties & Disclaimers">
              <InfoCard tone="amber">
                <strong>The Service is provided "as is" and "as available"</strong> without warranties of any kind,
                either express or implied, including but not limited to implied warranties of merchantability,
                fitness for a particular purpose, or non-infringement.
              </InfoCard>
              <p>We do not warrant that:</p>
              <BulletList items={[
                'The Service will be uninterrupted, error-free, or completely secure.',
                'Results obtained from the Service will be accurate, complete, or reliable for any specific business purpose.',
                'Any defects or errors will be corrected on a specific timeline.',
                'The Service or its servers are free from viruses or other harmful components.',
              ]} />
              <p>
                Financial data, reports, and calculations generated by the platform are provided for informational
                and operational convenience. They do not constitute professional accounting, tax, or legal advice.
                You should consult qualified professionals for those purposes.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 9 */}
            <SectionAnchor id="liability" icon={Scale} title="Limitation of Liability">
              <p>
                To the fullest extent permitted by applicable law, {COMPANY_NAME} and its officers, directors,
                employees, and agents shall not be liable for any:
              </p>
              <BulletList items={[
                'Indirect, incidental, special, consequential, or punitive damages.',
                'Loss of profits, revenue, data, business opportunities, or goodwill.',
                'Damages arising from unauthorized access to or alteration of your data.',
                'Damages resulting from your reliance on the accuracy of any information provided by the Service.',
                'Service interruptions, downtime, or data loss beyond our reasonable control.',
              ]} />
              <p>
                In no event shall our total cumulative liability to you exceed the amount you paid to us in the
                twelve (12) months immediately preceding the event giving rise to the claim.
              </p>
              <InfoCard tone="blue">
                Some jurisdictions do not allow the exclusion of certain warranties or limitations on liability, so
                some of the above may not apply to you. In those cases, our liability will be limited to the
                maximum extent permitted by law.
              </InfoCard>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 10 */}
            <SectionAnchor id="termination" icon={Trash2} title="Termination">
              <p>
                Either party may terminate the agreement governed by these Terms:
              </p>
              <DefList items={[
                {
                  term: 'Termination by you',
                  def: 'You may cancel your subscription at any time through your account settings or by contacting support. Access continues until the end of your current billing period.',
                },
                {
                  term: 'Termination by us — with notice',
                  def: 'We may terminate or suspend your account with 14 days\' written notice if you breach these Terms and fail to remedy the breach within 7 days of notification.',
                },
                {
                  term: 'Termination by us — immediately',
                  def: 'We may terminate immediately and without notice for serious violations including fraud, illegal activity, security threats, or non-payment exceeding 30 days past due.',
                },
                {
                  term: 'Effect of termination',
                  def: 'Upon termination, your right to access the Service ceases. Your data is retained for 90 days for export, then permanently deleted. Provisions that by their nature should survive termination (including liability, IP, and governing law sections) will do so.',
                },
              ]} />
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 11 */}
            <SectionAnchor id="governing-law" icon={Gavel} title="Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the laws of the{' '}
                <strong className="font-black text-slate-900">People's Republic of Bangladesh</strong>, without
                regard to its conflict of law provisions.
              </p>
              <BulletList items={[
                'Any dispute arising from or related to these Terms or the Service shall first be attempted to be resolved through good-faith negotiation between the parties.',
                'If negotiation fails within 30 days, disputes shall be submitted to the exclusive jurisdiction of the courts of Dhaka, Bangladesh.',
                'You waive any objection to the laying of venue in such courts and to any claim that proceedings have been brought in an inconvenient forum.',
              ]} />
              <p>
                If any provision of these Terms is found to be unenforceable or invalid by a court of competent
                jurisdiction, that provision shall be modified to the minimum extent necessary to make it
                enforceable, and the remaining provisions shall continue in full force and effect.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            {/* 12 */}
            <SectionAnchor id="contact" icon={MessageCircle} title="Contact Us">
              <p>
                If you have questions about these Terms or need assistance, please reach us through any of the
                following channels:
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <a
                  href={`mailto:${COMPANY_EMAIL}`}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(var(--slate-900),0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)]/30 hover:shadow-[0_16px_36px_rgba(var(--slate-900),0.1)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
                    <FileText size={18} className="text-[var(--brand-strong)]" />
                  </span>
                  <div>
                    <p className="font-black text-slate-950">Legal email</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[var(--brand)]">{COMPANY_EMAIL}</p>
                    <p className="mt-1 text-xs text-slate-500">For legal & compliance inquiries</p>
                  </div>
                </a>

                <a
                  href={`tel:${contactPhone}`}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(var(--slate-900),0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)]/30 hover:shadow-[0_16px_36px_rgba(var(--slate-900),0.1)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
                    <Phone size={18} className="text-[var(--brand-strong)]" />
                  </span>
                  <div>
                    <p className="font-black text-slate-950">Phone</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[var(--brand)]">{contactPhone}</p>
                    <p className="mt-1 text-xs text-slate-500">Available during business hours</p>
                  </div>
                </a>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(var(--slate-900),0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_16px_36px_rgba(var(--slate-900),0.1)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                    <MessageCircle size={18} className="text-emerald-700" />
                  </span>
                  <div>
                    <p className="font-black text-slate-950">WhatsApp</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-emerald-700">Chat with us</p>
                    <p className="mt-1 text-xs text-slate-500">Quickest response channel</p>
                  </div>
                </a>
              </div>

              <p className="text-[13px] text-slate-500">
                Also see our{' '}
                <Link to="/privacy-policy" className="font-semibold text-[var(--brand)] hover:underline">Privacy Policy</Link>
                {' '}for information on how we handle your data.
              </p>
            </SectionAnchor>

            {/* Bottom CTA */}
            <div className="rounded-[28px] border border-indigo-900/30 bg-[linear-gradient(135deg,#0c0b1e_0%,#12103a_50%,#0d2040_100%)] p-8 sm:p-10">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <img src={stockLedgerLogoIcon} alt="" className="h-7 w-7 object-contain" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">Questions about these terms?</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-300">
                    Our team is happy to clarify anything before you commit.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-[var(--brand-strong)] shadow-[0_14px_30px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                >
                  Log in to StockLedger
                  <ArrowRight size={16} />
                </Link>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <MessageCircle size={16} />
                  Talk to us
                </a>
              </div>
            </div>

          </article>
        </div>
      </div>

      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}
