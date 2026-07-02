import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, FileText, MessageCircle, Phone } from 'lucide-react';
import LandingHeader from '../LandingHeader.jsx';
import LandingFooter from '../LandingFooter.jsx';
import LandingChatWidget from '../LandingChatWidget.jsx';
import { contactPhone, whatsappUrl } from '../../constants.js';
import { stockLedgerLogoIcon } from '../../../../assets/brandAssets.js';

// Renders **bold** spans plus {email} / {privacy} placeholders so the
// locale files can stay plain strings.
function RichText({ text, email, t }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\{email\}|\{privacy\})/g);
  return parts.map((part, index) => {
    if (part === '{email}') {
      return (
        <a key={index} href={`mailto:${email}`} className="font-semibold text-[var(--brand)] hover:underline">{email}</a>
      );
    }
    if (part === '{privacy}') {
      return (
        <Link key={index} to="/privacy-policy" className="font-semibold text-[var(--brand)] hover:underline">
          {t('landing.footerLinks.privacy')}
        </Link>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const CARD_TONES = {
  blue: 'border-blue-100 bg-blue-50/70 text-blue-900',
  amber: 'border-amber-100 bg-amber-50/70 text-amber-900',
  rose: 'border-rose-100 bg-rose-50/70 text-rose-900',
  teal: 'border-teal-100 bg-teal-50/70 text-teal-900',
};

function Block({ block, email, t }) {
  switch (block.type) {
    case 'p':
      return <p><RichText text={block.text} email={email} t={t} /></p>;
    case 'bullets':
      return (
        <ul className="space-y-2 pl-1">
          {block.items.map((item) => (
            <li key={item.slice(0, 40)} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
              <span><RichText text={item} email={email} t={t} /></span>
            </li>
          ))}
        </ul>
      );
    case 'card':
      return (
        <div className={`rounded-2xl border px-5 py-4 text-[14px] font-medium leading-6 ${CARD_TONES[block.tone] || CARD_TONES.blue}`}>
          <RichText text={block.text} email={email} t={t} />
        </div>
      );
    case 'table':
      return (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {block.head.map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={cellIndex === 0 ? 'px-4 py-3 font-semibold text-slate-900' : 'px-4 py-3 text-slate-600'}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'defs':
      return (
        <div className={block.columns === 2 ? 'grid gap-3 sm:grid-cols-2' : 'space-y-4'}>
          {block.items.map(({ term, def }) => (
            <div key={term} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="font-black text-slate-950">{term}</p>
              <p className="mt-1 text-[13px] text-slate-600">{def}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function ContactCards({ contact, email }) {
  const cardClass = 'group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(var(--slate-900),0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(var(--slate-900),0.1)]';
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <a href={`mailto:${email}`} className={`${cardClass} hover:border-[var(--brand)]/30`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
          <FileText size={18} className="text-[var(--brand-strong)]" />
        </span>
        <div>
          <p className="font-black text-slate-950">{contact.emailTitle}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[var(--brand)]">{email}</p>
          <p className="mt-1 text-xs text-slate-500">{contact.emailNote}</p>
        </div>
      </a>
      <a href={`tel:${contactPhone}`} className={`${cardClass} hover:border-[var(--brand)]/30`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
          <Phone size={18} className="text-[var(--brand-strong)]" />
        </span>
        <div>
          <p className="font-black text-slate-950">{contact.phoneTitle}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-[var(--brand)]">{contactPhone}</p>
          <p className="mt-1 text-xs text-slate-500">{contact.phoneNote}</p>
        </div>
      </a>
      <a href={whatsappUrl} target="_blank" rel="noreferrer" className={`${cardClass} hover:border-emerald-200`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
          <MessageCircle size={18} className="text-emerald-700" />
        </span>
        <div>
          <p className="font-black text-slate-950">{contact.whatsappTitle}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-emerald-700">{contact.whatsappAction}</p>
          <p className="mt-1 text-xs text-slate-500">{contact.whatsappNote}</p>
        </div>
      </a>
    </div>
  );
}

export default function LegalPageLayout({ language, setLanguage, t, contentKey, sectionIcons, email, heroGradient, ctaGradient }) {
  const content = t(contentKey) || {};
  const sections = content.sections || [];
  const tocEntries = [...sections.map(({ id, label }) => ({ id, label })), { id: 'contact', label: content.contact?.label }];
  const [activeSection, setActiveSection] = useState(tocEntries[0]?.id);

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
    tocEntries.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function SectionHeading({ id, title }) {
    const Icon = sectionIcons[id] || FileText;
    return (
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand-soft),color-mix(in_srgb,var(--teal)_12%,white))]">
          <Icon size={18} className="text-[var(--brand-strong)]" />
        </span>
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
      </div>
    );
  }

  return (
    <main className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40" style={{ background: heroGradient }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-[440px] w-[440px] rounded-full bg-[var(--brand)] opacity-10 blur-[120px]" />
          <div className="absolute -right-20 top-0 h-[320px] w-[320px] rounded-full bg-teal-500 opacity-8 blur-[100px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        <div className="landing-container relative">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Link to="/landing" className="transition hover:text-white">{content.breadcrumbHome}</Link>
            <span>/</span>
            <span className="text-slate-300">{content.breadcrumb}</span>
          </div>

          <div className="mt-6 max-w-2xl">
            <span className="landing-eyebrow !text-[var(--teal)]">{content.eyebrow}</span>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl">{content.title}</h1>
            <p className="mt-4 text-base font-medium leading-7 text-slate-300 sm:text-lg">{content.intro}</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300">
              <Clock size={14} className="text-teal-400" />
              {content.updated}
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
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{content.toc}</p>
              {tocEntries.map(({ id, label }) => {
                const Icon = sectionIcons[id] || FileText;
                return (
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
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <article className="min-w-0 flex-1 space-y-14">
            {sections.map(({ id, label, blocks }) => (
              <div key={id} className="space-y-14">
                <section id={id} className="scroll-mt-28">
                  <SectionHeading id={id} title={label} />
                  <div className="space-y-4 text-[15px] leading-7 text-slate-600">
                    {blocks.map((block, blockIndex) => (
                      <Block key={blockIndex} block={block} email={email} t={t} />
                    ))}
                  </div>
                </section>
                <div className="border-t border-slate-100" />
              </div>
            ))}

            {/* Contact */}
            <section id="contact" className="scroll-mt-28">
              <SectionHeading id="contact" title={content.contact?.label} />
              <div className="space-y-4 text-[15px] leading-7 text-slate-600">
                <p>{content.contact?.intro}</p>
                <ContactCards contact={content.contact || {}} email={email} />
                {content.contact?.outro ? (
                  <p className="text-[13px] text-slate-500"><RichText text={content.contact.outro} email={email} t={t} /></p>
                ) : null}
              </div>
            </section>

            {/* Bottom CTA */}
            <div className="rounded-[28px] border border-[var(--brand)]/15 p-8 sm:p-10" style={{ background: ctaGradient }}>
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <img loading="lazy" decoding="async" src={stockLedgerLogoIcon} alt="" className="h-7 w-7 object-contain" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">{content.cta?.title}</h3>
                  <p className="mt-0.5 text-sm font-medium text-slate-300">{content.cta?.text}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,211,102,0.3)] transition hover:-translate-y-0.5"
                >
                  <MessageCircle size={16} />
                  {content.cta?.whatsapp}
                </a>
                <Link
                  to="/landing"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  {content.cta?.explore}
                  <ArrowRight size={16} />
                </Link>
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
