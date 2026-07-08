import { CheckCircle2 } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { featureStoryImages } from '../constants.js';

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

        <div className="mt-6 space-y-6">
          {copy.groups.map((group, index) => (
            <article key={group.title} className={`feature-story ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <ImagePlaceholder data={{ src: featureStoryImages[index], alt: group.title }} heightClass="aspect-[4/3]" fit="cover" position={index === 5 ? "center 22%" : undefined} />
              </div>
              <div className="feature-story-content">
                <p className="brand-chip inline-flex">{group.badge}</p>
                <h3 className="text-2xl font-black text-slate-950">{group.title}</h3>
                <div className="mt-5 space-y-3">
                  {group.items.map((item) => (
                    <p key={item} className="flex items-start gap-4 text-sm font-medium leading-6 text-slate-700">
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
