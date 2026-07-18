import { CheckCircle2 } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { featureStoryImages } from '../constants.js';

const IMAGE_SETTINGS = [
  { fit: 'contain', position: 'center', heightClass: 'aspect-[1586/992]' },
  { fit: 'contain', position: 'center', heightClass: 'aspect-[1659/948]' },
  { fit: 'contain', position: 'center', heightClass: 'aspect-[3/2]' },
];

export default function FeatureStorySection({ t }) {
  const copy = t('landing.featureStory');

  return (
    <section id="features" className="landing-section landing-section-brand">
      <div className="landing-container">
        <SectionHeader
          label={copy.label}
          title={copy.title}
          description={copy.description}
        />

        <div
          className="feature-story-list mobile-snap-track mt-6"
          role="region"
          aria-label={copy.title}
          tabIndex={0}
        >
          {copy.groups.slice(0, 3).map((group, index) => (
            <article key={group.title} className={`feature-story ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <ImagePlaceholder data={{ src: featureStoryImages[index], alt: group.title }} heightClass={IMAGE_SETTINGS[index]?.heightClass ?? "aspect-[4/3]"} fit={IMAGE_SETTINGS[index]?.fit ?? "contain"} position={IMAGE_SETTINGS[index]?.position} />
              </div>
              <div className="feature-story-content">
                <p className="brand-chip inline-flex">{group.badge}</p>
                <h3 className="feature-story-title text-2xl font-black text-slate-950">{group.title}</h3>
                <div className="mt-5 space-y-3">
                  {group.items.map((item) => (
                    <p key={item} className="feature-story-point flex items-start gap-4 text-sm font-medium leading-6 text-slate-700">
                      <span className="problem-item-icon mt-0.5">
                        <CheckCircle2 size={18} />
                      </span>
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}





