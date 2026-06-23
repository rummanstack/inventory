import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { navLinks } from '../constants.js';
import logoMark from '../../../assets/stockledger-logo-mark.svg';

export default function LandingHeader({ language, setLanguage, t }) {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <a href="#top" className="flex items-center gap-3" aria-label="StockLedger home">
          <span className="brand-mark">
            <img src={logoMark} alt="" className="h-full w-full object-contain" />
          </span>
          <span className="hidden sm:block">
            <span className="block text-lg font-black leading-none text-white">StockLedger</span>
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
