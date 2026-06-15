import { CheckCircle2 } from 'lucide-react';

export default function ProblemSection({ t }) {
  const problems = t('landing.problem.items');

  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="problem-panel">
          <div>
            <p className="landing-eyebrow">{t('landing.problem.eyebrow')}</p>
            <h2 className="landing-section-title">{t('landing.problem.title')}</h2>
            <p className="landing-section-text">{t('landing.problem.text')}</p>
          </div>

          <div className="grid gap-3">
            {problems.map((item) => (
              <div key={item} className="problem-item">
                <CheckCircle2 size={18} className="text-[var(--success)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
