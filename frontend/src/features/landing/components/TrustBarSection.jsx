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
                className="flex flex-col items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#24205a,#5550a8)] px-4 py-4 text-center"
              >
                <Icon size={20} className="text-blue-300" />
                <span className="text-xl font-black text-white">{value}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
