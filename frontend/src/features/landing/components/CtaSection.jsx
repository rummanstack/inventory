import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { contactPhone, whatsappUrl } from '../constants.js';

export default function CtaSection({ t }) {
  return (
    <section id="get-started" className="landing-section">
      <div className="landing-container">
        <div className="demo-panel">
          <div>
            <p className="landing-eyebrow">{t('landing.cta.eyebrow')}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-4xl">{t('landing.cta.title')}</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/login" className="demo-white-btn group">
              {t('landing.login')}
              <ArrowRight size={18} className="transition duration-200 group-hover:translate-x-1" />
            </Link>
            <a href={`tel:${contactPhone}`} className="demo-outline-btn group">
              <span className="demo-btn-icon"><Phone size={15} /></span>
              {t('landing.cta.callNow')}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="demo-whatsapp-btn group">
              <span className="demo-btn-icon"><MessageCircle size={15} /></span>
              {t('landing.cta.whatsapp')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
