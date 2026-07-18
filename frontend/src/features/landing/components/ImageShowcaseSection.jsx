import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import { CheckCircle2 } from 'lucide-react';
import { showcaseImages } from '../constants.js';

export default function ImageShowcaseSection({ t }) {
  const copy = t('landing.showcase');
  const showcaseImage = showcaseImages.find((image) => image.key === 'warehouseStock') ?? showcaseImages[0];

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
                <p key={bullet} className="flex items-start gap-3">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" />
                  <span>{bullet}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="showcase-product-frame">
            <ImagePlaceholder
              data={{ src: showcaseImage.src, alt: copy.imageAlts[showcaseImage.key] }}
              heightClass="aspect-[16/10]"
              fit="cover"
              position={showcaseImage.position}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
