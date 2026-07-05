import { Loader2 } from 'lucide-react';

export default function AuthSubmitButton({ submitting, busyLabel, children }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#08111f,var(--brand-strong)_55%,var(--brand))] text-base font-black text-white shadow-[0_18px_36px_var(--secondary-shadow-strong)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_var(--secondary-shadow-strong)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {submitting ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
