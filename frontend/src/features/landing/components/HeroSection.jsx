import { ArrowRight, Check, Lock, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { heroPortraitImage } from '../constants.js';

export default function HeroSection({ t, language }) {
  const points = t('landing.hero.points') || [];

  return (
    <section id="top" className="landing-hero">
      <div className="landing-container landing-hero-layout">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">{t('landing.hero.eyebrow')}</p>
          <h1 className="landing-hero-title">{t('landing.hero.title')}</h1>
          <p className="landing-hero-subtitle">{t('landing.hero.subtitle')}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to={buildLocalizedPath(language, '/contact')} className="landing-primary-btn">
              <MessageCircle size={18} />
              {t('landing.hero.bookDemo')}
            </Link>
            <a href="#pricing" className="landing-secondary-btn">
              {t('landing.hero.seePricing')}
              <ArrowRight size={18} />
            </a>
          </div>

          <div className="hero-proof-grid">
            {points.map((point) => (
              <div key={point} className="hero-proof-pill">
                <Check className="hero-proof-check" aria-hidden="true" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero-media">
          <div className="hero-portrait-shell">
            <div className="hero-browser-frame">
              <div className="hero-browser-bar" aria-hidden="true">
                <span className="hero-browser-dot hero-browser-dot-red" />
                <span className="hero-browser-dot hero-browser-dot-amber" />
                <span className="hero-browser-dot hero-browser-dot-green" />
                <span className="hero-browser-url">
                  <Lock size={10} />
                  stockledger.pro
                </span>
              </div>
              <ImagePlaceholder
                data={{ src: heroPortraitImage, alt: t('landing.hero.imageAlt') }}
                heightClass="aspect-[1568/1003]"
                variant="dashboard"
                fit="contain"
                position="center"
                priority
              />
            </div>
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




