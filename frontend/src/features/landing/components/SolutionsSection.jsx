import { ArrowRightLeft, BarChart3, BookOpenText, Landmark, Wallet } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { financeSpotlightImages, solutionShowcaseImage } from '../constants.js';

const ICONS = [Wallet, BookOpenText, ArrowRightLeft, Landmark, BarChart3];

export default function SolutionsSection({ t }) {
  const copy = t('landing.finance');

  return (
    <section id="solutions" className="landing-section landing-section-brand">
      <div className="landing-container">
        <SectionHeader
          label={copy.label}
          title={copy.title}
          description={copy.description}
        />

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article className="solution-card group">
            <ImagePlaceholder
              data={{ src: solutionShowcaseImage, alt: copy.showcaseAlt }}
              heightClass="aspect-[16/10]"
              fit="cover"
              position="top"
            />
            <div className="p-6">
              <Landmark size={28} className="text-[var(--brand)] transition-transform duration-300 group-hover:-rotate-6" />
              <h3 className="mt-5 text-xl font-black text-slate-950">{copy.showcaseTitle}</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{copy.showcaseText}</p>
            </div>
          </article>

          {copy.items.map((item, index) => {
            const Icon = ICONS[index];
            const image = financeSpotlightImages[index];
            return (
              <article key={item.title} className="solution-card group">
                <ImagePlaceholder
                  data={{ src: image.src, alt: item.title }}
                  heightClass="aspect-[16/10]"
                  fit="cover"
                  position={image.position}
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

