import CopyableField from './CopyableField.jsx';

export default function DemoInfo({ icon, label, value }) {
  return (
    <CopyableField
      icon={icon}
      label={label}
      value={value}
      wrapperClassName="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-[0_10px_28px_rgba(var(--slate-900),0.05)] transition hover:border-blue-200 hover:bg-blue-50/40"
      iconClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]"
      valueClassName="mt-0.5 block whitespace-nowrap text-base font-black text-slate-950"
    />
  );
}
