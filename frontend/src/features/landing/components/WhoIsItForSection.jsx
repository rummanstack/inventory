import {
  ShoppingCart,
  Pill,
  Cpu,
  Shirt,
  Wrench,
  Package,
  Wheat,
  Building2,
} from 'lucide-react';

const TYPE_ICONS = [ShoppingCart, Pill, Cpu, Shirt, Wrench, Package, Wheat, Building2];

export default function WhoIsItForSection({ t }) {
  const types = t('landing.whoIsItFor.types') || [];

  return (
    <section className="landing-section landing-section-brand">
      <div className="landing-container">
        <div className="text-center mb-10">
          <p className="landing-eyebrow">{t('landing.whoIsItFor.eyebrow')}</p>
          <h2 className="landing-section-title mt-4">{t('landing.whoIsItFor.title')}</h2>
          <p className="landing-section-text mx-auto max-w-xl mt-4">{t('landing.whoIsItFor.text')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {types.map((label, index) => {
            const Icon = TYPE_ICONS[index % TYPE_ICONS.length];
            return (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-[20px] border border-blue-100 bg-white px-4 py-6 text-center shadow-[0_2px_12px_rgba(var(--blue-700),0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(var(--blue-700),0.10)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
                  <Icon size={22} className="text-[var(--brand-strong)]" />
                </span>
                <span className="text-sm font-bold leading-5 text-slate-700">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
