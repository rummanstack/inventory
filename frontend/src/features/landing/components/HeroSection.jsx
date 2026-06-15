import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { heroDashboardImage, whatsappUrl } from '../constants.js';

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
              {t('landing.login')}
              <ArrowRight size={18} />
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="landing-secondary-btn">
              <MessageCircle size={18} />
              {t('landing.whatsappUs')}
            </a>
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
