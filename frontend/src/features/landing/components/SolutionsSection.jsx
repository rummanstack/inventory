import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { solutionHighlightImages, solutionIcons, solutionShowcaseImage } from '../constants.js';

export default function SolutionsSection({ t }) {
  const items = t('landing.solutions.items');

  return (
    <section id="solutions" className="landing-section landing-section-brand">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.solutions.label')}
          title={t('landing.solutions.title')}
          description={t('landing.solutions.description')}
        />

        <div className="solutions-layout mt-6">
          <div className="solutions-showcase">
            <ImagePlaceholder data={{ src: solutionShowcaseImage, alt: t('landing.images.showing') }} heightClass="aspect-[4/4]" fit="cover" position="top" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
          {items.map((solution, index) => {
            const Icon = solutionIcons[index];
            const image = solutionHighlightImages[index];
            return (
              <article key={solution.title} className="solution-card group">
                {image ? (
                  <ImagePlaceholder data={{ src: image.src, alt: solution.title }} heightClass="aspect-[3/2]" fit="cover" position={image.position} />
                ) : (
                  <div className="flex aspect-[3/2] items-center justify-center bg-[linear-gradient(135deg,rgba(var(--brand-soft),0.9),rgba(var(--blue-50),0.95))]">
                    <span className="feature-card-icon">
                      <Icon size={22} />
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <Icon size={28} className="text-[var(--brand)] transition-transform duration-300 group-hover:-rotate-6" />
                  <h3 className="mt-5 text-xl font-black text-slate-950">{solution.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{solution.description}</p>
                </div>
              </article>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
