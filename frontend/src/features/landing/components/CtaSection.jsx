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
            <Link to="/login" className="demo-white-btn">
              {t('landing.login')}
              <ArrowRight size={18} />
            </Link>
            <a href={`tel:${contactPhone}`} className="demo-outline-btn">
              <Phone size={18} />
              {t('landing.cta.callNow')}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="demo-outline-btn">
              <MessageCircle size={18} />
              {t('landing.cta.whatsapp')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
