import { Building2, Star, TrendingUp, Headphones } from 'lucide-react';

const STAT_ICONS = [Building2, TrendingUp, Star, Headphones];

export default function TrustBarSection({ t }) {
  const stats = t('landing.trustBar.items') || [];

  return (
    <section className="py-6">
      <div className="landing-container">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ value, label }, index) => {
            const Icon = STAT_ICONS[index % STAT_ICONS.length];
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-center shadow-[0_8px_22px_rgba(var(--slate-900),0.05)] ring-1 ring-slate-200/60"
              >
                <Icon size={20} className="text-[var(--brand-strong)]" />
                <span className="text-xl font-black text-slate-950">{value}</span>
                <span className="text-[12px] font-medium text-slate-500">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
