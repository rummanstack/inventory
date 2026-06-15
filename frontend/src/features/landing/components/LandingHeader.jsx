import { Link } from 'react-router-dom';
import { ArrowRight, Boxes } from 'lucide-react';
import LanguageSwitcher from '../../../components/LanguageSwitcher.jsx';
import { navLinks } from '../constants.js';

export default function LandingHeader({ language, setLanguage, t }) {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <a href="#top" className="flex items-center gap-3" aria-label="StockLedger home">
          <span className="brand-mark">
            <Boxes size={20} />
          </span>
          <span>
            <span className="block text-lg font-black leading-none text-slate-950">StockLedger</span>
            <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">
              stockledger.live
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Landing navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="landing-nav-link">
              {t(`landing.nav.${link.key}`)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher language={language} onChange={setLanguage} t={t} compact />
          <Link to="/login" className="landing-small-cta">
            {t('landing.tryDemo')}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
