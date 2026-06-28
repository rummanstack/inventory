import { CheckCircle2 } from 'lucide-react';

export default function ProblemSection({ t }) {
  const problems = t('landing.problem.items');

  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-container">
        <div className="problem-panel">
          <div>
            <p className="landing-eyebrow">{t('landing.problem.eyebrow')}</p>
            <h2 className="landing-section-title">{t('landing.problem.title')}</h2>
            <p className="landing-section-text">{t('landing.problem.text')}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {problems.map((item) => (
              <div key={item} className="problem-item">
                <span className="problem-item-icon">
                  <CheckCircle2 size={18} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
