import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { solutionIcons, solutionImages } from '../constants.js';

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

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((solution, index) => {
            const Icon = solutionIcons[index];
            return (
              <article key={solution.title} className="solution-card group">
                <ImagePlaceholder data={{ src: solutionImages[index], alt: solution.title }} heightClass="h-64 sm:h-72" />
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
    </section>
  );
}
