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
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">{t('landing.hero.eyebrow')}</p>
          <h1 className="landing-hero-title">{t('landing.hero.title')}</h1>
          <p className="landing-hero-subtitle">{t('landing.hero.subtitle')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="landing-primary-btn"
            >
              <MessageCircle size={18} />
              {t('landing.whatsappUs')}
            </a>
            <a href="#pricing" className="landing-secondary-btn">
              {t('landing.hero.seePricing')}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>

        <div className="landing-hero-media">
          <ImagePlaceholder
            data={heroImage}
            heightClass="h-[340px] sm:h-[430px] lg:h-[560px]"
            variant="dashboard"
            fit="cover"
            position="left top"
            priority
          />
        </div>
      </div>
    </section>
  );
}