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

        <div className="workflow-track mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {copy.steps.map((step, index) => {
            const Icon = workflowIcons[index];
            return (
              <article key={step.title} className="workflow-card">
                <div className="workflow-step-mark flex items-center justify-between">
                  <span className="workflow-number">{String(index + 1).padStart(2, '0')}</span>
                  <Icon size={22} className="text-[var(--brand)]" />
                </div>
                <div className="workflow-step-copy">
                  <h3 className="mt-4 text-base font-black text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{step.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
