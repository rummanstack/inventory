import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { showcaseImages } from '../constants.js';

export default function ImageShowcaseSection({ t }) {
  return (
    <section className="landing-section bg-white/60">
      <div className="landing-container">
        <div className="showcase-grid">
          <div>
            <p className="landing-eyebrow">{t('landing.showcase.eyebrow')}</p>
            <h2 className="landing-section-title">{t('landing.showcase.title')}</h2>
            <p className="landing-section-text">{t('landing.showcase.text')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {showcaseImages.map((image) => (
              <ImagePlaceholder
                key={image.key}
                data={{ src: image.src, alt: t(`landing.images.${image.key}`) }}
                heightClass="h-52"
                fit={image.fit}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
