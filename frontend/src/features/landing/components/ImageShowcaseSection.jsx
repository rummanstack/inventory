import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { showcaseImages } from '../constants.js';

export default function ImageShowcaseSection({ t }) {
  const copy = t('landing.showcase');

  return (
    <section className="landing-section landing-section-brand">
      <div className="landing-container">
        <div className="showcase-visual-layout">
          <div className="showcase-copy">
            <p className="landing-eyebrow">{copy.eyebrow}</p>
            <h2 className="landing-section-title">{copy.title}</h2>
            <p className="landing-section-text">{copy.text}</p>
            <div className="mt-5 space-y-3 text-sm font-medium leading-6 text-slate-700">
              {copy.bullets.map((bullet) => (
                <p key={bullet}>{bullet}</p>
              ))}
            </div>
          </div>
          <div className="showcase-collage">
            {showcaseImages.map((image, index) => (
              <ImagePlaceholder
                key={image.key}
                data={{ src: image.src, alt: copy.imageAlts[image.key] || image.key }}
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
