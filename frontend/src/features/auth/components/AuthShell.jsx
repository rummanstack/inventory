import { Link } from 'react-router-dom';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

// Shared layout for the public auth pages (login + register): dark brand panel on
// the left, form card on the right. The brand panel is deliberately dark in BOTH
// themes, so every color in it is a literal value — theme-remapped utilities
// (text-white/NN, slate, --brand) turn dark-on-dark when the dark theme inverts
// the palette (see index.css [data-theme="dark"]).
export default function AuthShell({ brand, eyebrow, title, points = [], footnote, children }) {
  return (
    <div className="page-shell">
      <div className="relative h-screen overflow-y-auto">
        {/* Ambient page background — keeps the area around the card from
            reading as flat/empty, especially on mobile where the dark brand
            panel below is hidden. */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--brand)_16%,transparent)] blur-[120px]" />
          <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[rgba(13,148,136,0.1)] blur-[110px]" />
          <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] blur-[130px]" />
        </div>

        <div className="relative flex min-h-full items-center justify-center px-0 py-0 sm:px-4 sm:py-8">
          <div className="grid w-full max-w-5xl overflow-hidden bg-[var(--bg-dark)] shadow-[0_40px_110px_-18px_rgba(30,20,70,0.4)] ring-1 ring-[rgba(15,23,42,0.06)] sm:rounded-[28px] lg:grid-cols-[2fr_3fr]">

            {/* Brand panel — full hero on desktop, compact header bar on mobile */}
            <div className="relative flex flex-col justify-between overflow-hidden p-6 pb-8 lg:p-10">
              {/* Aurora background + fine grid, all literal colors (dark in both themes) */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(160deg,#0e0c25_0%,#1d1547_58%,#122f3a_100%)]" />
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[rgba(109,91,194,0.3)] blur-[100px]" />
                <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[rgba(13,148,136,0.22)] blur-[110px]" />
                <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(130%_90%_at_25%_0%,black,transparent_78%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)]" />
              </div>

              <div className="relative">
                <Link to="/" className="inline-flex items-center gap-3" aria-label="StockLedger">
                  <span className="logo-chip flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                    <img src={stockLedgerLogoIcon} alt="" className="h-9 w-9 object-contain" />
                  </span>
                  <span>
                    <span className="block text-lg font-black leading-none tracking-tight text-white">StockLedger</span>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#e9e2ff]/75">{brand}</span>
                  </span>
                </Link>

                <p className="mt-8 flex w-fit items-center gap-2 rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.07)] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#ddd2ff] backdrop-blur lg:mt-12">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf] shadow-[0_0_0_3px_rgba(45,212,191,0.18)]" />
                  {eyebrow}
                </p>
                <h2 className="mt-3 max-w-xs text-xl font-black leading-[1.2] tracking-tight text-white lg:mt-4 lg:text-[28px] lg:leading-[1.15]">
                  {title}
                </h2>
              </div>

              <ul className="relative mt-8 hidden space-y-4 lg:mt-10 lg:block">
                {points.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3 backdrop-blur transition-colors duration-200 hover:border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.07)]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(109,91,194,0.4),rgba(60,42,134,0.18))] text-[#ddd2ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                      <Icon size={18} />
                    </span>
                    <span className="pt-2 text-sm font-semibold leading-6 text-[rgba(255,255,255,0.82)]">{text}</span>
                  </li>
                ))}
              </ul>

              <p className="relative mt-10 hidden border-t border-[rgba(255,255,255,0.1)] pt-4 text-xs font-semibold leading-5 text-[rgba(255,255,255,0.5)] lg:block">
                {footnote}
              </p>
            </div>

            {/* Form panel */}
            <div className="flex flex-col justify-center rounded-t-[28px] bg-white px-6 py-10 sm:px-12 sm:py-12 lg:rounded-none">
              {children}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
