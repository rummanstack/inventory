import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Cookie,
  Database,
  Eye,
  FileText,
  Lock,
  MessageCircle,
  Phone,
  RefreshCw,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import { contactPhone, whatsappUrl } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

const LAST_UPDATED = 'June 29, 2026';
const COMPANY_NAME = 'StockLedger (Arinda)';
const COMPANY_EMAIL = 'privacy@stockledger.com.bd';

const SECTIONS = [
  { id: 'introduction',  label: 'Introduction',               Icon: FileText },
  { id: 'data-we-collect', label: 'Data We Collect',           Icon: Database },
  { id: 'how-we-use',   label: 'How We Use Your Data',        Icon: Eye },
  { id: 'data-sharing', label: 'Data Sharing',                Icon: Users },
  { id: 'security',     label: 'Data Security',               Icon: Lock },
  { id: 'your-rights',  label: 'Your Rights',                 Icon: UserCheck },
  { id: 'cookies',      label: 'Cookies & Tracking',          Icon: Cookie },
  { id: 'retention',    label: 'Data Retention',              Icon: Clock },
  { id: 'changes',      label: 'Policy Changes',              Icon: RefreshCw },
  { id: 'contact',      label: 'Contact Us',                  Icon: MessageCircle },
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

function Highlight({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[13px] font-bold text-[var(--brand-strong)]">
      {children}
    </span>
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
    teal:  'border-teal-100 bg-teal-50/70 text-teal-900',
  };
  return (
    <div className={`rounded-2xl border px-5 py-4 text-[14px] font-medium leading-6 ${tones[tone]}`}>
      {children}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  const { language, setLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState('introduction');
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
      <section className="relative overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40"
        style={{
          background: 'linear-gradient(145deg, var(--bg-dark) 0%, var(--brand-strong) 55%, #1a1440 100%)',
        }}
      >
        {/* decorative radial glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-[440px] w-[440px] rounded-full bg-[var(--brand)] opacity-10 blur-[120px]" />
          <div className="absolute -right-20 top-0 h-[320px] w-[320px] rounded-full bg-teal-500 opacity-8 blur-[100px]" />
        </div>
        {/* grid pattern */}
        <div className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="landing-container relative">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link to="/landing" className="transition hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Privacy Policy</span>
          </div>

          <div className="mt-6 max-w-2xl">
            <span className="landing-eyebrow !text-[var(--teal)]">Legal</span>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-base font-medium leading-7 text-slate-300 sm:text-lg">
              We are committed to protecting your data. This policy explains what we collect,
              why we collect it, and how we keep it secure.
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

            <SectionAnchor id="introduction" icon={FileText} title="Introduction">
              <p>
                Welcome to <strong className="font-black text-slate-900">{COMPANY_NAME}</strong> — a multi-tenant inventory,
                retail POS, dealer-distribution, and finance management platform built for businesses across Bangladesh
                and beyond.
              </p>
              <p>
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
                use our software-as-a-service (SaaS) platform. By accessing or using StockLedger, you agree to the
                practices described in this policy.
              </p>
              <InfoCard tone="blue">
                <strong>Who does this apply to?</strong> This policy applies to all users of the StockLedger platform —
                platform administrators, tenant business owners, managers, operators, and any other individuals whose
                data is processed through our system.
              </InfoCard>
              <p>
                We operate under a <Highlight>multi-tenant architecture</Highlight>. Each business (tenant) has its own
                isolated data environment. StockLedger platform staff can access tenant data only for support and
                operational purposes, always in accordance with this policy.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="data-we-collect" icon={Database} title="Data We Collect">
              <p>We collect information in the following categories:</p>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Category</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Examples</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['Account data', 'Name, email address, phone number, role, password hash'],
                      ['Business data', 'Tenant name, business type, org settings, subscription tier'],
                      ['Operational data', 'Products, inventory movements, invoices, purchases, payments'],
                      ['Financial data', 'Finance account balances, expense records, profit reports'],
                      ['People data', 'Customer names/phones, supplier details, DSR profiles, employee payroll'],
                      ['Usage data', 'Activity logs, audit trail, page views, session tokens'],
                      ['Device & network', 'IP address, browser type, operating system (from server logs)'],
                    ].map(([cat, ex]) => (
                      <tr key={cat}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{cat}</td>
                        <td className="px-4 py-3 text-slate-600">{ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p>
                We do <strong className="font-bold text-slate-900">not</strong> intentionally collect sensitive personal
                data such as national ID numbers, biometric data, or health records unless your business type
                (e.g., pharmacy) requires it for regulatory compliance.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="how-we-use" icon={Eye} title="How We Use Your Data">
              <p>We use collected data to:</p>
              <BulletList items={[
                'Provide, operate, and improve the StockLedger platform and its features.',
                'Authenticate users and maintain secure sessions.',
                'Generate reports, dashboards, and analytics for your business.',
                'Send transactional notifications (e.g., low-stock alerts, due payment reminders).',
                'Respond to support requests and troubleshoot issues.',
                'Enforce platform terms, prevent fraud, and maintain system security.',
                'Comply with applicable laws and regulations.',
              ]} />
              <InfoCard tone="teal">
                We do <strong>not</strong> sell your data to third parties. We do not use your business data to train
                AI models or for any advertising purposes.
              </InfoCard>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="data-sharing" icon={Users} title="Data Sharing">
              <p>
                We share data only in the limited circumstances below:
              </p>
              <BulletList items={[
                'Infrastructure providers (e.g., Render, Vercel, Neon/PostgreSQL) that host and run the platform under strict data-processing agreements.',
                'When required by law, court order, or government authority in Bangladesh or applicable jurisdictions.',
                'With your explicit consent — for example, when you integrate a third-party service.',
                'In the event of a merger, acquisition, or sale of assets, in which case you will be notified.',
              ]} />
              <p>
                All third-party service providers we use are contractually bound to process data only as directed by
                us and are prohibited from using it for their own purposes.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="security" icon={Lock} title="Data Security">
              <p>
                We implement industry-standard technical and organizational measures to protect your data:
              </p>
              <BulletList items={[
                'All data in transit is encrypted using TLS (HTTPS).',
                'Passwords are hashed using bcrypt — we never store plain-text passwords.',
                'Session tokens are stored in HTTP-only cookies to prevent XSS access.',
                'Multi-tenant isolation is enforced at the application layer: every query is scoped to a tenant ID.',
                'Regular automated database backups with point-in-time recovery.',
                'Audit logs capture all sensitive data changes (who, what, when).',
                'Role-based access control (RBAC) with fine-grained, per-tenant permission customization.',
              ]} />
              <InfoCard tone="amber">
                <strong>Important:</strong> No system is 100% secure. If you suspect a security breach, please contact us
                immediately at <strong>{COMPANY_EMAIL}</strong> so we can respond swiftly.
              </InfoCard>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="your-rights" icon={UserCheck} title="Your Privacy Rights">
              <p>
                Depending on your jurisdiction, you may have the following rights regarding your personal data:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { right: 'Access', desc: 'Request a copy of the personal data we hold about you.' },
                  { right: 'Correction', desc: 'Ask us to correct inaccurate or incomplete data.' },
                  { right: 'Deletion', desc: 'Request erasure of your personal data ("right to be forgotten").' },
                  { right: 'Portability', desc: 'Receive your data in a machine-readable format.' },
                  { right: 'Restriction', desc: 'Ask us to limit how we process your data.' },
                  { right: 'Objection', desc: 'Object to processing based on our legitimate interests.' },
                ].map(({ right, desc }) => (
                  <div key={right} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="font-black text-slate-950">{right}</p>
                    <p className="mt-1 text-[13px] text-slate-600">{desc}</p>
                  </div>
                ))}
              </div>
              <p>
                To exercise any right, contact your account administrator or reach out to us directly at{' '}
                <a href={`mailto:${COMPANY_EMAIL}`} className="font-semibold text-[var(--brand)] hover:underline">{COMPANY_EMAIL}</a>.
                We will respond within 30 days.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="cookies" icon={Cookie} title="Cookies & Tracking">
              <p>
                StockLedger uses a minimal set of cookies and similar technologies:
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Cookie</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Purpose</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['Session cookie', 'Authenticates your login session', 'HTTP-only, essential'],
                      ['Active tenant', 'Remembers which tenant you are operating as (localStorage)', 'Functional'],
                      ['Language preference', 'Stores your language selection (localStorage)', 'Functional'],
                    ].map(([name, purpose, type]) => (
                      <tr key={name}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{name}</td>
                        <td className="px-4 py-3 text-slate-600">{purpose}</td>
                        <td className="px-4 py-3 text-slate-600">{type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                We do not use advertising cookies, third-party tracking pixels, or analytics cookies that identify you
                across other websites.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="retention" icon={Clock} title="Data Retention">
              <p>
                We retain your data for as long as your account is active or as needed to provide you services:
              </p>
              <BulletList items={[
                'Active tenant data is retained for the duration of your subscription.',
                'After subscription termination, data is kept for 90 days to allow for reactivation or export requests.',
                'After 90 days post-termination, data is permanently deleted from production databases.',
                'Audit logs and activity records are retained for 2 years for compliance purposes.',
                'Backup snapshots are cycled on a 30-day rolling retention schedule.',
              ]} />
              <p>
                You may request earlier deletion by contacting us at{' '}
                <a href={`mailto:${COMPANY_EMAIL}`} className="font-semibold text-[var(--brand)] hover:underline">{COMPANY_EMAIL}</a>.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="changes" icon={RefreshCw} title="Policy Changes">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
                or applicable law. When we do:
              </p>
              <BulletList items={[
                'We will update the "Last updated" date at the top of this page.',
                'For material changes, we will notify tenant administrators via in-app notification or email at least 14 days before the change takes effect.',
                'Your continued use of the platform after the effective date constitutes acceptance of the updated policy.',
              ]} />
              <p>
                We encourage you to review this page periodically. Previous versions are available on request.
              </p>
            </SectionAnchor>

            <div className="border-t border-slate-100" />

            <SectionAnchor id="contact" icon={MessageCircle} title="Contact Us">
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your
                personal data, please reach out:
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
                    <p className="font-black text-slate-950">Email</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[var(--brand)]">{COMPANY_EMAIL}</p>
                    <p className="mt-1 text-xs text-slate-500">We respond within 2 business days</p>
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
            </SectionAnchor>

            {/* Bottom CTA */}
            <div className="rounded-[28px] border border-[var(--brand)]/15 bg-[linear-gradient(135deg,var(--brand-strong)_0%,#1a1440_55%,#0d2040_100%)] p-8 sm:p-10">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <img src={stockLedgerLogoIcon} alt="" className="h-7 w-7 object-contain" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">Ready to get started?</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-300">
                    Your data is safe with us. Start your free trial today.
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
                  Contact sales
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
