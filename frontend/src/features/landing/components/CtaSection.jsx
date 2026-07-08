import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { contactPhone, whatsappUrl } from '../constants.js';

export default function CtaSection({ t }) {
  const copy = t('landing.cta');

  return (
    <section id="get-started" className="landing-section">
      <div className="landing-container">
        <div className="cta-panel">
          <div>
            <p className="landing-eyebrow">{copy.eyebrow}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">{copy.text}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="demo-whatsapp-btn group">
              <span className="demo-btn-icon"><MessageCircle size={15} /></span>
              {copy.whatsapp}
            </a>
            <a href={`tel:${contactPhone}`} className="cta-outline-btn group">
              <span className="demo-btn-icon"><Phone size={15} /></span>
              {copy.callNow}
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
