import { CheckCircle2 } from 'lucide-react';
import SectionHeader from './shared/SectionHeader.jsx';

function focusContactForm(event) {
  event.preventDefault();
  document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
  window.setTimeout(() => {
    document.getElementById('contact-name')?.focus();
  }, 400);
}

export default function PricingSection({ t }) {
  const plans = t('landing.pricing.plans');

  return (
    <section id="pricing" className="landing-section bg-white/60">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.pricing.label')}
          title={t('landing.pricing.title')}
          description={t('landing.pricing.description')}
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.name} className={`pricing-card ${plan.featured ? 'pricing-card-featured' : ''}`}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand-strong)]">{plan.label}</p>
              <h3 className="mt-4 text-2xl font-black text-slate-950">{plan.name}</h3>
              <p className="mt-5 flex items-baseline gap-1 text-slate-950">
                <span className="text-3xl font-black">{plan.price}</span>
                {plan.cadence ? <span className="text-sm font-black text-slate-500">{plan.cadence}</span> : null}
              </p>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{plan.description}</p>
              <div className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <p key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={18} className="shrink-0 text-[var(--success)]" />
                    {item}
                  </p>
                ))}
              </div>
              <a href="#contact-form" onClick={focusContactForm} className={plan.featured ? 'btn-primary mt-8 w-full rounded-2xl' : 'btn-secondary mt-8 w-full rounded-2xl'}>
                {t('landing.pricing.contactUs')}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
