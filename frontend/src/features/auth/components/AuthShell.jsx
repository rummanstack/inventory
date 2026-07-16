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
          <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] blur-[110px]" />
          <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] blur-[130px]" />
        </div>

        <div className="relative flex min-h-full items-center justify-center px-0 py-0 sm:px-4 sm:py-8">
          <div className="grid w-full max-w-5xl overflow-hidden bg-[var(--bg-dark)] shadow-[0_30px_90px_rgba(8,17,31,0.22)] sm:rounded-[28px] lg:grid-cols-[2fr_3fr]">

            {/* Brand panel — full hero on desktop, compact header bar on mobile */}
            <div className="relative flex flex-col justify-between overflow-hidden p-6 pb-8 lg:p-10">
              {/* Ambient glows */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[rgba(60,42,134,0.14)] blur-[100px]" />
                <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[rgba(60,42,134,0.22)] blur-[110px]" />
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

                <p className="mt-8 text-[11px] font-black uppercase tracking-[0.24em] text-[#ddd2ff] lg:mt-12">{eyebrow}</p>
                <h2 className="mt-3 max-w-xs text-xl font-black leading-[1.2] tracking-tight text-white lg:mt-4 lg:text-[28px] lg:leading-[1.15]">
                  {title}
                </h2>
              </div>

              <ul className="relative mt-8 hidden space-y-5 lg:mt-10 lg:block">
                {points.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(60,42,134,0.16)] text-[#ddd2ff] backdrop-blur">
                      <Icon size={18} />
                    </span>
                    <span className="pt-2 text-sm font-semibold leading-6 text-[rgba(255,255,255,0.8)]">{text}</span>
                  </li>
                ))}
              </ul>

              <p className="relative mt-10 hidden text-xs font-semibold leading-5 text-[rgba(255,255,255,0.5)] lg:block">
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
