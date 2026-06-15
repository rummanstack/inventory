import { featureCardIcons } from '../constants.js';

export default function FeatureGridSection({ t }) {
  const featureCards = t('landing.featureCards');

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature, index) => {
            const Icon = featureCardIcons[index];
            return (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-icon">
                  <Icon size={21} />
                </span>
                <h3 className="mt-5 text-base font-black text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
