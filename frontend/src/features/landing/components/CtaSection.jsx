import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { contactPhone, whatsappUrl } from '../constants.js';

export default function CtaSection({ t }) {
  return (
    <section id="get-started" className="landing-section">
      <div className="landing-container">
        <div className="cta-panel">
          <div>
            <p className="landing-eyebrow">{t('landing.cta.eyebrow')}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{t('landing.cta.title')}</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="demo-whatsapp-btn group">
              <span className="demo-btn-icon"><MessageCircle size={15} /></span>
              {t('landing.cta.whatsapp')}
            </a>
            <a href={`tel:${contactPhone}`} className="cta-outline-btn group">
              <span className="demo-btn-icon"><Phone size={15} /></span>
              {t('landing.cta.callNow')}
            </a>
            <Link to="/register" className="demo-white-btn group">
              {t('landing.registerNow')}
              <ArrowRight size={18} className="transition duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
