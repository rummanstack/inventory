import { Link } from 'react-router-dom';
import { stockLedgerLogoHorizontal, stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

// Shared layout for the public auth pages (login + register): dark brand panel on
// the left, form card on the right. The brand panel is deliberately dark in BOTH
// themes, so every color in it is a literal value — theme-remapped utilities
// (text-white/NN, slate, --brand) turn dark-on-dark when the dark theme inverts
// the palette (see index.css [data-theme="dark"]).
export default function AuthShell({ brand, eyebrow, title, points = [], footnote, children }) {
  return (
    <div className="page-shell">
      <div className="h-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-4 py-8">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] shadow-[0_30px_90px_rgba(8,17,31,0.22)] lg:grid-cols-[2fr_3fr]">

            {/* Brand panel */}
            <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--bg-dark)] p-10 lg:flex">
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

                <p className="mt-12 text-[11px] font-black uppercase tracking-[0.24em] text-[#ddd2ff]">{eyebrow}</p>
                <h2 className="mt-4 max-w-xs text-[28px] font-black leading-[1.15] tracking-tight text-white">
                  {title}
                </h2>
              </div>

              <ul className="relative mt-10 space-y-5">
                {points.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[rgba(60,42,134,0.16)] text-[#ddd2ff] backdrop-blur">
                      <Icon size={18} />
                    </span>
                    <span className="pt-2 text-sm font-semibold leading-6 text-white/80">{text}</span>
                  </li>
                ))}
              </ul>

              <p className="relative mt-10 text-xs font-semibold leading-5 text-white/50">
                {footnote}
              </p>
            </div>

            {/* Form panel */}
            <div className="flex flex-col justify-center bg-white px-6 py-12 sm:px-12">
              {/* Mobile-only logo — logo-chip keeps a white base so the logo stays
                  visible when the dark theme flips the card surface. */}
              <Link to="/" className="logo-chip mb-6 flex h-12 w-fit items-center rounded-control px-2 transition hover:opacity-80 lg:hidden">
                <img src={stockLedgerLogoHorizontal} alt="StockLedger" className="h-full w-auto object-contain" />
              </Link>

              {children}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
