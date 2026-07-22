import { BarChart3, Boxes, CheckCircle2, ReceiptText, UsersRound } from 'lucide-react';
import SectionHeader from './shared/SectionHeader.jsx';

const PLACEHOLDER_ICONS = [Boxes, ReceiptText, BarChart3];

function WorkflowPlaceholder({ step, index }) {
  const Icon = PLACEHOLDER_ICONS[index];

  return (
    <div className="workflow-story-visual" role="img" aria-label={step.imageAlt}>
      <div className="workflow-mock-window">
        <div className="workflow-mock-topbar" aria-hidden="true">
          <span className="workflow-mock-brand"><span /> StockLedger</span>
          <span className="workflow-mock-search" />
          <span className="workflow-mock-avatar" />
        </div>
        <div className="workflow-mock-body" aria-hidden="true">
          <div className="workflow-mock-sidebar">
            {[0, 1, 2, 3, 4].map((item) => <span key={item} className={item === index ? 'is-active' : ''} />)}
          </div>
          <div className="workflow-mock-content">
            <div className="workflow-mock-heading">
              <span><Icon size={18} /> {step.screenTitle}</span>
              <i />
            </div>
            <div className="workflow-mock-stats">
              {[0, 1, 2].map((item) => <span key={item}><b /> <i /></span>)}
            </div>
            <div className="workflow-mock-panel">
              <div className="workflow-mock-chart">
                {[42, 68, 54, 82, 64, 92, 76].map((height, item) => (
                  <i key={item} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="workflow-mock-list">
                {[0, 1, 2, 3].map((item) => <span key={item}><b /><i /></span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="workflow-placeholder-note">{step.placeholder}</span>
    </div>
  );
}

export default function WorkflowSection({ t }) {
  const copy = t('landing.workflow');

  return (
    <section id="workflow" className="landing-section landing-section-soft workflow-story-section">
      <div className="landing-container">
        <SectionHeader label={copy.label} title={copy.title} description={copy.description} />

        <div className="workflow-story-list">
          {copy.steps.slice(0, 3).map((step, index) => (
            <article key={step.title} className={`workflow-story-row ${index % 2 === 1 ? 'workflow-story-row-reverse' : ''}`}>
              <div className="workflow-story-copy">
                <span className="workflow-story-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <p className="workflow-story-kicker">{step.kicker}</p>
                <h3>{step.title}</h3>
                <p className="workflow-story-description">{step.description}</p>
                <ul className="workflow-story-points">
                  {step.points.map((point) => (
                    <li key={point}><CheckCircle2 size={18} aria-hidden="true" /> <span>{point}</span></li>
                  ))}
                </ul>
              </div>
              <WorkflowPlaceholder step={step} index={index} />
            </article>
          ))}
        </div>

        <div className="workflow-story-outcome">
          <UsersRound size={21} aria-hidden="true" />
          <p><strong>{copy.outcomeTitle}</strong> {copy.outcomeText}</p>
        </div>
      </div>
    </section>
  );
}