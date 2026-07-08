import SectionHeader from './shared/SectionHeader.jsx';
import { workflowIcons } from '../constants.js';

export default function WorkflowSection({ t }) {
  const copy = t('landing.workflow');

  return (
    <section id="workflow" className="landing-section landing-section-soft">
      <div className="landing-container">
        <SectionHeader
          label={copy.label}
          title={copy.title}
          description={copy.description}
        />

        <div className="workflow-rail mt-5">
          {copy.rail.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {copy.steps.map((step, index) => {
            const Icon = workflowIcons[index];
            return (
              <article key={step.title} className="workflow-card">
                <Icon size={24} className="mt-5 text-[var(--brand)]" />
                <h3 className="mt-4 text-base font-black text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
