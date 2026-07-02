import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { navLinks } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

export default function LandingHeader({ language, setLanguage, t }) {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <a href="#top" className="flex items-center gap-3" aria-label="StockLedger home">
          <img src={stockLedgerLogoIcon} alt="" className="h-11 w-11 object-contain drop-shadow-[0_10px_24px_rgba(15,23,42,0.2)]" />
          <span className="hidden sm:block">
            <span className="block text-lg font-black leading-none tracking-tight text-white">StockLedger</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{t('landing.tagline')}</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Landing navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="landing-nav-link">
              {t(`landing.nav.${link.key}`)}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher language={language} onChange={setLanguage} t={t} compact />
          <Link to="/login" className="landing-small-cta">
            <span className="hidden sm:inline">{t('landing.login')}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
