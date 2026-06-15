import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, MessageCircle } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import CopyableField from './shared/CopyableField.jsx';
import { demoEmail, demoPassword, heroDashboardImage, whatsappUrl } from '../constants.js';

export default function HeroSection({ t }) {
  const heroImage = {
    src: heroDashboardImage,
    alt: t('landing.images.heroDashboard'),
  };

  return (
    <section id="top" className="landing-hero">
      <div className="landing-container landing-hero-layout">
        <div className="max-w-3xl">
          <p className="landing-eyebrow">{t('landing.hero.eyebrow')}</p>
          <h1 className="landing-hero-title">{t('landing.hero.title')}</h1>
          <p className="landing-hero-subtitle">{t('landing.hero.subtitle')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="landing-primary-btn">
              {t('landing.tryDemo')}
              <ArrowRight size={18} />
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="landing-secondary-btn">
              <MessageCircle size={18} />
              {t('landing.whatsappDemo')}
            </a>
          </div>

          <div className="landing-demo-strip">
            <CopyableField
              icon={Mail}
              label={t('landing.hero.demoEmailLabel')}
              value={demoEmail}
              wrapperClassName="flex w-full items-center gap-3 rounded-2xl bg-slate-50/90 p-3 text-left transition hover:bg-slate-100"
              iconClassName="landing-demo-icon"
            />
            <CopyableField
              icon={KeyRound}
              label={t('landing.hero.demoPasswordLabel')}
              value={demoPassword}
              wrapperClassName="flex w-full items-center gap-3 rounded-2xl bg-slate-50/90 p-3 text-left transition hover:bg-slate-100"
              iconClassName="landing-demo-icon"
            />
          </div>
        </div>

        <div className="landing-hero-media">
          <ImagePlaceholder data={heroImage} heightClass="h-[300px] sm:h-[380px] lg:h-[440px]" variant="dashboard" />
          <div className="landing-floating-note hidden md:block">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--brand-strong)]">{t('landing.hero.liveView')}</span>
            <p className="mt-2 text-sm font-bold leading-5 text-slate-700">{t('landing.hero.liveViewText')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
