import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Boxes,
  Building2,
  ChevronDown,
  Compass,
  Menu,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { megaMenuSections, navLinks } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';
import { buildLocalizedPath, stripLangPrefix } from '../../../app/hooks/usePublicLanguage.js';

const SECTION_META = [
  {
    Icon: Boxes,
    headerClass: 'bg-[#f5f1ff] ring-[#3c2a86]/10',
    iconClass: 'bg-[#3c2a86] text-white shadow-[0_10px_24px_rgba(60,42,134,0.22)]',
    dotClass: 'bg-[#6d5bc2]',
    activeClass: 'bg-[#f1edff] text-[#2d2765] ring-1 ring-[#3c2a86]/10',
  },
  {
    Icon: Building2,
    headerClass: 'bg-teal-50 ring-teal-700/10',
    iconClass: 'bg-teal-700 text-white shadow-[0_10px_24px_rgba(13,148,136,0.2)]',
    dotClass: 'bg-teal-600',
    activeClass: 'bg-teal-50 text-teal-950 ring-1 ring-teal-700/10',
  },
  {
    Icon: BookOpenText,
    headerClass: 'bg-blue-50 ring-blue-700/10',
    iconClass: 'bg-blue-700 text-white shadow-[0_10px_24px_rgba(29,78,216,0.2)]',
    dotClass: 'bg-blue-600',
    activeClass: 'bg-blue-50 text-blue-950 ring-1 ring-blue-700/10',
  },
];

function MegaMenuPanel({ onNavigate, pathname, language }) {
  const basePath = stripLangPrefix(pathname);
  return (
    <div className="fixed left-1/2 top-20 hidden w-[min(1120px,calc(100vw-1.5rem))] -translate-x-1/2 pt-3 lg:block">
      <nav
        id="landing-explore-panel"
        aria-labelledby="landing-explore-button"
        className="landing-mega-menu-surface max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-[28px] border border-slate-200/90 bg-white text-slate-950 shadow-[0_32px_90px_rgba(15,23,42,0.24),0_8px_24px_rgba(15,23,42,0.1)] ring-1 ring-slate-950/[0.04]"
      >
        <div className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(110deg,#fbfaff_0%,#f7f8ff_52%,#eef9f8_100%)] px-6 py-5">
          <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-teal-200/30 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 top-8 h-24 w-48 rounded-full bg-violet-200/30 blur-3xl" />
          <div className="relative flex items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(145deg,#3c2a86,#2d2765)] text-white shadow-[0_14px_30px_rgba(60,42,134,0.24)]">
                <Compass size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#3c2a86]">Navigation guide</p>
                  <span className="hidden rounded-full border border-teal-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-black text-teal-800 xl:inline-flex">One connected platform</span>
                </div>
                <h2 className="mt-1 text-xl font-black tracking-[-0.02em] text-slate-950">Explore StockLedger</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">Browse by workflow, business type, or software category.</p>
              </div>
            </div>
            <Link
              to={buildLocalizedPath(language, '/get-started')}
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#2d2765] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(45,39,101,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#3c2a86] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
              onClick={onNavigate}
            >
              Find my setup
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-200/80 px-2 py-3">
          {megaMenuSections.map((section, index) => {
            const meta = SECTION_META[index] ?? SECTION_META[0];
            const Icon = meta.Icon;
            const sectionActive = basePath === section.href;

            return (
              <section key={section.title} className="min-w-0 px-3 py-2">
                <Link
                  to={buildLocalizedPath(language, section.href)}
                  className={`group flex items-start gap-3 rounded-[20px] p-3 ring-1 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c2a86]/30 ${meta.headerClass}`}
                  onClick={onNavigate}
                  aria-current={sectionActive ? 'page' : undefined}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${meta.iconClass}`}>
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-950">{section.title}</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-slate-600">{section.description}</span>
                  </span>
                  <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </Link>

                <div className="mt-2 grid gap-0.5">
                  {section.links.map((link) => {
                    const isActive = basePath === link.href;

                    return (
                      <Link
                        key={link.href}
                        to={buildLocalizedPath(language, link.href)}
                        className={`group flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3c2a86]/25 ${isActive ? meta.activeClass : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'}`}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass} ${isActive ? 'shadow-[0_0_0_4px_rgba(148,163,184,0.14)]' : 'opacity-70 transition group-hover:opacity-100'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-extrabold">{link.label}</span>
                          <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{link.hint}</span>
                        </span>
                        <ArrowRight size={14} className="shrink-0 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:text-slate-500 group-hover:opacity-100" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-5 border-t border-white/10 bg-[linear-gradient(100deg,#171427_0%,#2d2765_62%,#173b4a_100%)] px-6 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/10 text-teal-200">
              <Sparkles size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black">Not sure where to begin?</p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-300">We will map the right modules to the way your business already works.</p>
            </div>
          </div>
          <Link
            to={buildLocalizedPath(language, '/contact')}
            className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
            onClick={onNavigate}
          >
            <MessageCircle size={15} />
            Book a guided demo
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function LandingHeader({ language, setLanguage, t }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const location = useLocation();
  const desktopMenuRef = useRef(null);
  const desktopTriggerRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setDesktopOpen(false);
  }, [language, location.pathname, location.hash]);

  useEffect(() => {
    if (!desktopOpen) return undefined;

    function handlePointerDown(event) {
      if (!desktopMenuRef.current?.contains(event.target)) {
        setDesktopOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setDesktopOpen(false);
        desktopTriggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [desktopOpen]);

  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to={buildLocalizedPath(language, '/landing')} className="flex items-center gap-3" aria-label={t('landing.homeAriaLabel')}>
          <img src={stockLedgerLogoIcon} alt="" className="h-11 w-11 object-contain drop-shadow-[0_10px_24px_rgba(15,23,42,0.2)]" />
          <span className="hidden sm:block">
            <span className="block text-lg font-black leading-none tracking-tight text-white">StockLedger</span>
            <span className="mt-1 block text-[11px] font-medium text-white/70">{t('landing.tagline')}</span>
          </span>
        </Link>

        <div ref={desktopMenuRef} className="relative hidden lg:block">
          <div className="flex items-center gap-1" aria-label={t('landing.navAriaLabel')}>
            <button
              ref={desktopTriggerRef}
              id="landing-explore-button"
              type="button"
              className={`landing-nav-link inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${desktopOpen ? 'bg-white text-[var(--brand-strong)] shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-white hover:text-[var(--brand-strong)]' : ''}`}
              onClick={() => setDesktopOpen((current) => !current)}
              aria-expanded={desktopOpen}
              aria-haspopup="true"
              aria-controls="landing-explore-panel"
            >
              <span>Explore</span>
              <ChevronDown size={16} className={`transition ${desktopOpen ? 'rotate-180' : ''}`} />
            </button>
            {navLinks.filter((link) => ['workflow', 'pricing', 'getStarted', 'contact'].includes(link.key)).map((link) => (
              <Link key={link.href} to={buildLocalizedPath(language, link.href)} className="landing-nav-link">
                {t(`landing.nav.${link.key}`)}
              </Link>
            ))}
          </div>
          {desktopOpen ? <MegaMenuPanel pathname={location.pathname} language={language} onNavigate={() => setDesktopOpen(false)} /> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15 lg:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <LanguageSwitcher language={language} onChange={setLanguage} t={t} compact />
          {/* /login isn't part of the bilingual public site, so no locale prefix here */}
          <Link to="/login" className="landing-small-cta">
            <span className="hidden sm:inline">{t('landing.login')}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className={`${menuOpen ? 'block' : 'hidden'} border-t border-white/10 bg-[rgba(8,10,24,0.96)] backdrop-blur lg:hidden`}>
        <div className="landing-container grid gap-4 py-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/90">Explore</p>
                <p className="mt-1 text-sm font-medium text-slate-300">Browse the main public pages before login.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={buildLocalizedPath(language, link.href)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(`landing.nav.${link.key}`)}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {megaMenuSections.map((section) => (
              <section key={section.title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/90">{section.title}</p>
                <div className="mt-3 grid gap-2">
                  {section.links.slice(0, 4).map((link) => (
                    <Link
                      key={link.href}
                      to={buildLocalizedPath(language, link.href)}
                      className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-bold text-white/90 transition hover:bg-white/10 hover:text-white"
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}



