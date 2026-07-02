export default function InsightLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,rgba(var(--white),0.95),rgba(var(--slate-50),0.95))] px-4 py-3 shadow-[inset_0_1px_0_rgba(var(--white),0.8)]">
      <span className="min-w-0 truncate text-sm font-bold text-slate-600">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}
