import { Link } from 'react-router-dom';
import { ArrowUp, MessageCircle, Phone } from 'lucide-react';
import { contactPhone, navLinks, whatsappUrl } from '../constants.js';
import logoMark from '../../../assets/stockledger-logo-mark.svg';

export default function LandingFooter({ t }) {
  return (
    <footer id="contact" className="border-t border-white/10 bg-[linear-gradient(180deg,var(--bg-dark)_0%,var(--brand-strong)_100%)] text-white">
      <div className="landing-container py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="brand-mark">
                <img src={logoMark} alt="" className="h-full w-full object-contain" />
              </span>
              <div>
                <h2 className="text-lg font-black text-white">StockLedger</h2>
                <p className="text-xs font-semibold text-slate-300">{t('landing.footer.tagline')}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-300">{t('landing.footer.description')}</p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 lg:pt-2" aria-label="Footer navigation">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-bold text-slate-300 transition hover:text-white">
                {t(`landing.nav.${link.key}`)}
              </a>
            ))}
            <Link to="/login" className="text-sm font-bold text-slate-300 transition hover:text-white">
              {t('landing.login')}
            </Link>
          </nav>

          <div className="flex flex-col gap-2 sm:items-end">
            <a href={`tel:${contactPhone}`} className="inline-flex items-center gap-2 text-base font-black text-white transition hover:text-slate-200">
              <Phone size={16} className="text-[var(--blue-200)]" />
              {contactPhone}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white">
              <MessageCircle size={16} className="text-[var(--blue-200)]" />
              {t('landing.footer.whatsapp')}
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-400">{t('landing.footer.copyright')}</p>
          <a href="#top" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 transition hover:text-white">
            {t('landing.footer.backToTop')}
            <ArrowUp size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}
