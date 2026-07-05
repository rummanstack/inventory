import { useState } from 'react';
import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react';
import SectionHeader from './shared/SectionHeader.jsx';

const VISIBLE_FEATURE_COUNT = 5;

function focusContactForm(event) {
  event.preventDefault();
  document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
  window.setTimeout(() => {
    document.getElementById('contact-name')?.focus();
  }, 400);
}

function PricingCard({ plan, features, expanded, onToggle, hiddenCount, t }) {
  const visibleFeatures = expanded ? features : features.slice(0, VISIBLE_FEATURE_COUNT);

  return (
    <article className={`pricing-card flex h-full flex-col ${plan.featured ? 'pricing-card-featured' : 'pricing-card-muted'}`}>
      {plan.featured ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black text-slate-950">{plan.name}</h3>
            <p className="mt-2 text-[12px] font-medium text-[var(--brand-strong)]">{plan.label}</p>
          </div>
          <span className="pricing-card-badge">{t('landing.pricing.featuredBadge')}</span>
        </div>
      ) : (
        <>
          <p className="text-[12px] font-medium text-slate-500">{plan.label}</p>
          <h3 className="mt-4 text-2xl font-black text-slate-900">{plan.name}</h3>
        </>
      )}
      <p className="mt-5 flex items-baseline gap-1 text-slate-950">
        <span className="text-3xl font-black">{plan.price}</span>
        {plan.cadence ? <span className="text-sm font-black text-slate-400">{plan.cadence}</span> : null}
      </p>
      <p className="mt-4 text-sm font-normal leading-7 text-slate-600">{plan.description}</p>
      <div className="mt-6 space-y-3">
        {visibleFeatures.map((feature, index) => {
          const included = Boolean(plan.included?.[index]);
          return (
            <p key={feature} className={`flex items-center gap-3 text-sm font-medium leading-6 ${included ? 'text-slate-700' : 'text-slate-400'}`}>
              {included ? (
                <CheckCircle2 size={18} className="shrink-0 text-[var(--success)]" />
              ) : (
                <XCircle size={18} className="shrink-0 text-slate-300" />
              )}
              <span className={included ? '' : 'line-through'}>{feature}</span>
            </p>
          );
        })}
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-strong)] transition hover:text-[var(--brand)]"
          onClick={onToggle}
        >
          {expanded ? t('landing.pricing.showLessFeatures') : `${t('landing.pricing.showAllFeatures')} (+${hiddenCount})`}
          <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      ) : null}
      <div className="mt-auto pt-8">
        <a href="#contact-form" onClick={focusContactForm} className={`w-full rounded-2xl ${plan.featured ? 'btn-primary shadow-[0_18px_34px_rgba(var(--blue-700),0.34)] ring-2 ring-[rgba(var(--brand),0.12)]' : 'btn-secondary opacity-90'}`}>
          {t('landing.pricing.contactUs')}
        </a>
        <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
          {t('landing.pricing.note')}
        </p>
      </div>
    </article>
  );
}

export default function PricingSection({ t }) {
  const plans = t('landing.pricing.plans');
  const features = t('landing.pricing.features');
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = features.length - VISIBLE_FEATURE_COUNT;

  return (
    <section id="pricing" className="landing-section landing-section-soft">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.pricing.label')}
          title={t('landing.pricing.title')}
          description={t('landing.pricing.description')}
        />
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs font-semibold text-slate-500">
          {t('landing.pricing.disclaimer')}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              features={features}
              expanded={expanded}
              hiddenCount={hiddenCount}
              onToggle={() => setExpanded((current) => !current)}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
