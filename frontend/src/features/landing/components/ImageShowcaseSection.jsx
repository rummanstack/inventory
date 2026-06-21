import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { showcaseImages } from '../constants.js';

export default function ImageShowcaseSection({ t }) {
  return (
    <section className="landing-section landing-section-brand">
      <div className="landing-container">
        <div className="showcase-visual-layout">
          <div className="showcase-copy">
            <p className="landing-eyebrow">{t('landing.showcase.eyebrow')}</p>
            <h2 className="landing-section-title">{t('landing.showcase.title')}</h2>
            <p className="landing-section-text">{t('landing.showcase.text')}</p>
          </div>
          <div className="showcase-collage">
            {showcaseImages.map((image, index) => (
              <ImagePlaceholder
                key={image.key}
                data={{ src: image.src, alt: t(`landing.images.${image.key}`) }}
                heightClass={index === 0 ? 'showcase-collage-main' : 'showcase-collage-tile'}
                fit={image.fit}
                position={image.position}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
