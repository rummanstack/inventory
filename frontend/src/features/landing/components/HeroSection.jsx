import { ArrowRight, MessageCircle } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { heroPortraitImage } from '../constants.js';

export default function HeroSection({ t }) {
  const points = t('landing.hero.points') || [];

  return (
    <section id="top" className="landing-hero">
      <div className="landing-container landing-hero-layout">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">{t('landing.hero.eyebrow')}</p>
          <h1 className="landing-hero-title">{t('landing.hero.title')}</h1>
          <p className="landing-hero-subtitle">{t('landing.hero.subtitle')}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {points.map((point) => (
              <div key={point} className="hero-proof-pill">
                <span className="hero-proof-dot" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#contact-form" className="landing-primary-btn">
              <MessageCircle size={18} />
              {t('landing.hero.bookDemo')}
            </a>
            <a href="#pricing" className="landing-secondary-btn">
              {t('landing.hero.seePricing')}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>

        <div className="landing-hero-media">
          <div className="hero-portrait-shell">
            <ImagePlaceholder
              data={{ src: heroPortraitImage, alt: t('landing.hero.imageAlt') }}
              heightClass="aspect-[16/10]"
              variant="dashboard"
              fit="fill"
              position="center"
              priority
            />
            <div className="hero-image-badge-wrap">
              <div className="hero-image-badge">
                <p className="hero-image-badge-label">{t('landing.hero.badgeLabel')}</p>
                <p className="hero-image-badge-value">{t('landing.hero.badgeValue')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}




