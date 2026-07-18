import { useState } from 'react';
import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import SectionHeader from './shared/SectionHeader.jsx';

const COLLAPSED_FEATURE_INDEXES = [0, 1, 2, 9, 20];

function PricingCard({ plan, features, expanded, onToggle, ctaPath, stretch = false, t }) {
  const featureEntries = features.map((feature, featureIndex) => ({ feature, featureIndex }));
  const visibleFeatureEntries = expanded
    ? featureEntries
    : COLLAPSED_FEATURE_INDEXES.map((featureIndex) => featureEntries[featureIndex]).filter(Boolean);
  const hiddenCount = Math.max(0, features.length - visibleFeatureEntries.length);

  return (
    <article className={'pricing-card flex flex-col ' + (stretch ? 'sm:h-full ' : '') + (plan.featured ? 'pricing-card-featured' : 'pricing-card-muted')}>
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
        {visibleFeatureEntries.map(({ feature, featureIndex }) => {
          const included = Boolean(plan.included?.[featureIndex]);
          return (
            <p
              key={feature}
              className={'flex items-start gap-3 text-sm font-medium leading-6 ' + (included ? 'text-slate-700' : 'text-slate-400')}
            >
              {included ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
              ) : (
                <XCircle size={18} className="mt-0.5 shrink-0 text-slate-300" />
              )}
              <span className={included ? '' : 'line-through'}>{feature}</span>
            </p>
          );
        })}
      </div>

      {hiddenCount > 0 ? (
        <button
          type="button"
          className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-left text-xs font-semibold text-[var(--brand-strong)] transition hover:text-[var(--brand)]"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {expanded
            ? t('landing.pricing.showLessFeatures')
            : t('landing.pricing.showAllFeatures') + ' (+' + hiddenCount + ')'}
          <ChevronDown size={14} className={(expanded ? 'rotate-180 ' : '') + 'transition-transform'} />
        </button>
      ) : null}

      <div className="mt-auto pt-8">
        <Link
          to={ctaPath}
          className={'w-full rounded-2xl ' + (plan.featured ? 'btn-primary shadow-[0_18px_34px_rgba(var(--secondary-shadow-strong),0.34)] ring-2 ring-[rgba(var(--brand),0.12)]' : 'btn-secondary opacity-90')}
        >
          {plan.cta ?? t('landing.pricing.contactUs')}
        </Link>
        <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
          {t('landing.pricing.note')}
        </p>
      </div>
    </article>
  );
}

export default function PricingSection({ t, language }) {
  const plans = t('landing.pricing.plans');
  const features = t('landing.pricing.features');
  const [expanded, setExpanded] = useState(false);
  const contactPath = buildLocalizedPath(language, '/contact');
  const mobilePlans = [...plans].sort((first, second) => Number(Boolean(second.featured)) - Number(Boolean(first.featured)));

  function renderPlan(plan, stretch = false) {
    return (
      <PricingCard
        key={plan.name}
        plan={plan}
        features={features}
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        ctaPath={plan.action === 'register' ? '/register' : contactPath}
        stretch={stretch}
        t={t}
      />
    );
  }

  return (
    <section id="pricing" className="landing-section landing-section-soft">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.pricing.label')}
          title={t('landing.pricing.title')}
          description={t('landing.pricing.description')}
        />
        <p className="mt-4 max-w-2xl text-xs font-semibold text-slate-500">
          {t('landing.pricing.disclaimer')}
        </p>

        <div
          className="mobile-snap-track pricing-track mt-6 grid items-start gap-5 sm:hidden"
          role="region"
          aria-label={t('landing.pricing.title')}
          tabIndex={0}
        >
          {mobilePlans.map((plan) => renderPlan(plan))}
        </div>

        <div
          className={'mt-6 hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-4 ' + (expanded ? 'sm:items-start' : 'sm:items-stretch')}
        >
          {plans.map((plan) => renderPlan(plan, !expanded))}
        </div>
      </div>
    </section>
  );
}
