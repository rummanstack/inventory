import { Landmark, ShieldCheck, UsersRound } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { platformPillarImages } from '../constants.js';

const ICONS = [Landmark, UsersRound, ShieldCheck];

export default function SolutionsSection({ t }) {
  const copy = t('landing.platform');

  return (
    <section id="solutions" className="landing-section landing-section-brand">
      <div className="landing-container">
        <SectionHeader
          label={copy.label}
          title={copy.title}
          description={copy.description}
        />

        <div className="solution-track mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {copy.items.slice(0, 3).map((item, index) => {
            const Icon = ICONS[index];
            const image = platformPillarImages[index];

            return (
              <article key={item.title} className="solution-card group">
                <ImagePlaceholder
                  data={{ src: image, alt: item.imageAlt || item.title }}
                  heightClass="aspect-[16/10]"
                  fit="contain"
                  position="center"
                />
                <div className="p-6">
                  <Icon size={28} className="text-[var(--brand)] transition-transform duration-300 group-hover:-rotate-6" />
                  <h3 className="mt-5 text-xl font-black text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{item.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
