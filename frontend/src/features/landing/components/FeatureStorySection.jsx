import { CheckCircle2 } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { featureStoryImages } from '../constants.js';

const IMAGE_SETTINGS = [
  { fit: 'contain', position: 'center', heightClass: 'aspect-[1586/992]' },
  { fit: 'contain', position: 'center', heightClass: 'aspect-[1568/1003]' },
  { fit: 'contain', position: 'center', heightClass: 'aspect-[3/2]' },
  { fit: 'contain', position: 'center', heightClass: 'aspect-[3/2]' },
  { fit: 'contain', position: 'center', heightClass: 'aspect-[1586/992]' },
  { fit: 'contain', position: 'center', heightClass: 'aspect-[3/2]' },
];

// Lead with the back office so the page communicates the whole platform
// before moving into its sales, inventory, field, and collection workflows.
const STORY_ORDER = [4, 5, 0, 2, 1, 3];

export default function FeatureStorySection({ t }) {
  const copy = t('landing.featureStory');
  const stories = STORY_ORDER.map((sourceIndex) => ({
    group: copy.groups[sourceIndex],
    image: featureStoryImages[sourceIndex],
    sourceIndex,
  })).filter(({ group, image }) => group && image);

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
          {stories.map(({ group, image, sourceIndex }, index) => (
            <article key={group.title} className={`feature-story ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <ImagePlaceholder data={{ src: image, alt: group.title }} heightClass={IMAGE_SETTINGS[sourceIndex]?.heightClass ?? 'aspect-[3/2]'} fit={IMAGE_SETTINGS[sourceIndex]?.fit ?? 'contain'} position={IMAGE_SETTINGS[sourceIndex]?.position} />
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





