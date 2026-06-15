import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, MessageCircle, Phone } from 'lucide-react';
import DemoInfo from './shared/DemoInfo.jsx';
import { demoEmail, demoPassword, demoPhone, whatsappUrl } from '../constants.js';

export default function DemoSection({ t }) {
  return (
    <section id="demo" className="landing-section">
      <div className="landing-container">
        <div className="demo-panel">
          <div>
            <p className="landing-eyebrow">{t('landing.demo.eyebrow')}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{t('landing.demo.title')}</h2>
            <p className="mt-4 text-base font-semibold leading-7 text-[var(--text-soft)]">{t('landing.demo.text', { phone: demoPhone })}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DemoInfo icon={Mail} label={t('landing.demo.emailLabel')} value={demoEmail} />
              <DemoInfo icon={KeyRound} label={t('landing.demo.passwordLabel')} value={demoPassword} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/login" className="demo-white-btn">
              {t('landing.tryDemo')}
              <ArrowRight size={18} />
            </Link>
            <a href={`tel:${demoPhone}`} className="demo-outline-btn">
              <Phone size={18} />
              {t('landing.demo.callNow')}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="demo-outline-btn">
              <MessageCircle size={18} />
              {t('landing.demo.whatsapp')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
