import { Loader2 } from 'lucide-react';

export default function AuthSubmitButton({ submitting, busyLabel, children }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      aria-busy={submitting}
      className="auth-submit group relative mt-6 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-base font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_18px_38px_-10px_rgba(60,42,134,0.5)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_24px_48px_-12px_rgba(60,42,134,0.6)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 after:pointer-events-none after:absolute after:inset-0 after:-translate-x-[130%] after:bg-[linear-gradient(115deg,transparent_32%,rgba(255,255,255,0.32)_50%,transparent_66%)] hover:after:translate-x-[130%] hover:after:[transition:transform_0.65s_ease]"
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
