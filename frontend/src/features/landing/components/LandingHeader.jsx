import { ArrowRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { navLinks } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

export default function LandingHeader({ language, setLanguage, t }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [language]);

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

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('landing.navAriaLabel')}>
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} className="landing-nav-link">
              {t(`landing.nav.${link.key}`)}
            </Link>
          ))}
        </nav>

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

      <div className={`${menuOpen ? 'block' : 'hidden'} border-t border-white/10 bg-[rgba(8,10,24,0.92)] backdrop-blur lg:hidden`}>
        <nav className="landing-container grid gap-2 py-4" aria-label={`${t('landing.navAriaLabel')} mobile`}>
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
        </nav>
      </div>
    </header>
  );
}
