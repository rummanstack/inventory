import { BriefcaseBusiness, Landmark, ShieldCheck, UsersRound } from 'lucide-react';

const ICONS = [BriefcaseBusiness, Landmark, UsersRound, ShieldCheck];

export default function TrustBarSection({ t }) {
  const items = t('landing.capabilityStrip') || [];

  return (
    <section className="pb-6 pt-2 sm:pb-8 sm:pt-3">
      <div className="landing-container">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map(({ value, label }, index) => {
            const Icon = ICONS[index];
            return (
              <div key={value} className="capability-strip-card">
                <div className="flex items-center gap-3">
                  <span className="capability-strip-icon">
                    <Icon size={18} className="text-[var(--brand-strong)]" />
                  </span>
                  <span className="text-base font-black text-slate-950">{value}</span>
                </div>
                <p className="mt-3 text-[13px] font-medium leading-6 text-slate-600">{label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
