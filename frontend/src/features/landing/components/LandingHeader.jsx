import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { megaMenuSections, navLinks } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

function MegaMenuPanel({ t, onNavigate }) {
  return (
    <div className="absolute left-1/2 top-full hidden w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 pt-4 lg:block">
      <div className="overflow-hidden rounded-[30px] border border-white/15 bg-[linear-gradient(180deg,rgba(12,18,40,0.98)_0%,rgba(12,24,56,0.98)_100%)] p-3 text-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_0.9fr]">
          {megaMenuSections.map((section) => (
            <section key={section.title} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/90">{section.title}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-300">{section.description}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="group rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-bold text-white/90 transition hover:border-cyan-300/20 hover:bg-white/10 hover:text-white"
                    onClick={onNavigate}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>{link.label}</span>
                      <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </span>
                  </Link>
                ))}
              </div>
              <Link to={section.href} className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 transition hover:gap-3" onClick={onNavigate}>
                View all
                <ArrowRight size={13} />
              </Link>
            </section>
          ))}

          <aside className="rounded-[24px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.04)_100%)] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/90">Start here</p>
            <h3 className="mt-3 text-2xl font-black leading-tight text-white">Choose the fastest path into StockLedger</h3>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-300">Explore product depth, then move directly into rollout and demo conversations.</p>
            <div className="mt-5 grid gap-2.5">
              <Link to="/get-started" className="rounded-2xl border border-white/12 bg-cyan-300/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-cyan-300/15" onClick={onNavigate}>Get Started</Link>
              <Link to="/contact" className="rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10" onClick={onNavigate}>Contact</Link>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-xs font-semibold leading-5 text-slate-300">
              Best for buyers comparing inventory, POS, accounting, HR, DSR, and business-management workflows.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function LandingHeader({ language, setLanguage, t }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const location = useLocation();
  const desktopMenuRef = useRef(null);

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
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [desktopOpen]);

  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to="/landing" className="flex items-center gap-3" aria-label={t('landing.homeAriaLabel')}>
          <img src={stockLedgerLogoIcon} alt="" className="h-11 w-11 object-contain drop-shadow-[0_10px_24px_rgba(15,23,42,0.2)]" />
          <span className="hidden sm:block">
            <span className="block text-lg font-black leading-none tracking-tight text-white">StockLedger</span>
            <span className="mt-1 block text-[11px] font-medium text-white/70">{t('landing.tagline')}</span>
          </span>
        </Link>

        <div ref={desktopMenuRef} className="relative hidden lg:block">
          <div className="flex items-center gap-1" aria-label={t('landing.navAriaLabel')}>
            <button
              type="button"
              className={`landing-nav-link inline-flex items-center gap-2 ${desktopOpen ? 'bg-white/10 text-white' : ''}`}
              onClick={() => setDesktopOpen((current) => !current)}
              aria-expanded={desktopOpen}
              aria-haspopup="true"
            >
              <span>Explore</span>
              <ChevronDown size={16} className={`transition ${desktopOpen ? 'rotate-180' : ''}`} />
            </button>
            {navLinks.filter((link) => ['workflow', 'pricing', 'getStarted', 'contact'].includes(link.key)).map((link) => (
              <Link key={link.href} to={link.href} className="landing-nav-link">
                {t(`landing.nav.${link.key}`)}
              </Link>
            ))}
          </div>
          {desktopOpen ? <MegaMenuPanel t={t} onNavigate={() => setDesktopOpen(false)} /> : null}
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
                  to={link.href}
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
                      to={link.href}
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



