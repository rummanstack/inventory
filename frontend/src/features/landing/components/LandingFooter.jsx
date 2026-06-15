import { Boxes } from 'lucide-react';
import { contactPhone } from '../constants.js';

export default function LandingFooter({ t }) {
  return (
    <footer id="contact" className="border-t border-slate-200 bg-white">
      <div className="landing-container grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-mark">
              <Boxes size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-950">StockLedger</h2>
              <p className="text-sm font-semibold text-slate-500">{t('landing.footer.tagline')}</p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-slate-600">{t('landing.footer.description')}</p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-sm font-bold text-slate-500">{t('landing.footer.contactLabel')}</p>
          <a href={`tel:${contactPhone}`} className="mt-1 block text-2xl font-black text-slate-950 hover:text-[var(--brand-strong)]">
            {contactPhone}
          </a>
          <p className="mt-4 text-sm font-semibold text-slate-500">{t('landing.footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
