import SectionHeader from './shared/SectionHeader.jsx';
import { workflowIcons } from '../constants.js';

export default function WorkflowSection({ t }) {
  const steps = t('landing.workflow.steps');

  return (
    <section id="workflow" className="landing-section">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.workflow.label')}
          title={t('landing.workflow.title')}
          description={t('landing.workflow.description')}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = workflowIcons[index];
            return (
              <article key={step.title} className="workflow-card">
                <span className="workflow-number">{index + 1}</span>
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
