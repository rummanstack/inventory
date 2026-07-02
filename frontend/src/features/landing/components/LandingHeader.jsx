import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { navLinks } from '../constants.js';
import { stockLedgerLogoHorizontal } from '../../../assets/brandAssets.js';

export default function LandingHeader({ language, setLanguage, t }) {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <a href="#top" className="flex items-center gap-3" aria-label="StockLedger home">
          <img src={stockLedgerLogoHorizontal} alt="StockLedger" className="h-10 w-auto object-contain" />
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
