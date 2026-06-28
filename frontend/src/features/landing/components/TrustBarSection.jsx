import { Building2, Star, TrendingUp, Headphones } from 'lucide-react';

const STATS = [
  { Icon: Building2, value: '500+', label: 'Active Businesses' },
  { Icon: TrendingUp, value: '৳50 Crore+', label: 'Revenue Tracked' },
  { Icon: Star, value: '4.9 / 5', label: 'Customer Rating' },
  { Icon: Headphones, value: '24/7', label: 'Support Available' },
];

export default function TrustBarSection() {
  return (
    <section className="bg-[linear-gradient(180deg,var(--bg-dark)_0%,var(--brand-strong)_100%)] py-6">
      <div className="landing-container">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({ Icon, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-[18px] border border-white/10 bg-white/8 px-4 py-4 text-center backdrop-blur-sm"
            >
              <Icon size={20} className="text-[var(--blue-200)]" />
              <span className="text-xl font-black text-white">{value}</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
