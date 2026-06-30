import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCssVar } from '../../utils/theme.js';
import { Sparkline } from './charts.jsx';
import { cx } from './utils.js';

function useCountUp(target, duration = 700) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target == null || !Number.isFinite(target)) return;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="brand-chip">{eyebrow}</p> : null}
        {title ? <h1 className="page-title mt-2">{title}</h1> : null}
        {description ? <p className="mt-1.5 max-w-2xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function StatCard({ title, value, helper, icon: Icon, tone = 'blue', trend, trendPct, trendLabel, rawValue, formatter }) {
  const animated = useCountUp(rawValue ?? null);
  const displayValue = rawValue != null && formatter != null ? formatter(animated) : value;
  const tones = {
    blue: {
      card: 'from-white to-brand-soft',
      icon: 'bg-brand text-white shadow-[0_10px_20px_var(--secondary-shadow)]',
      accent: 'bg-brand-strong',
      spark: getCssVar('--brand', '#373373'),
    },
    emerald: {
      card: 'from-white to-success-soft',
      icon: 'bg-success text-white shadow-[0_10px_20px_var(--success-line)]',
      accent: 'bg-success',
      spark: getCssVar('--success', '#37a864'),
    },
    amber: {
      card: 'from-white to-warning-soft',
      icon: 'bg-warning text-white shadow-[0_10px_20px_var(--warning-line)]',
      accent: 'bg-warning',
      spark: getCssVar('--warning', '#f8aa17'),
    },
    indigo: {
      card: 'from-white to-brand-soft',
      icon: 'bg-brand-strong text-white shadow-[0_10px_20px_var(--secondary-shadow-strong)]',
      accent: 'bg-brand-strong',
      spark: getCssVar('--brand-strong', '#425bf6'),
    },
    rose: {
      card: 'from-white to-danger-soft',
      icon: 'bg-danger text-white shadow-[0_10px_20px_var(--danger-line)]',
      accent: 'bg-danger',
      spark: getCssVar('--danger', '#f1454f'),
    },
    slate: {
      card: 'from-white to-slate-100/80',
      icon: 'bg-slate-800 text-white shadow-[0_10px_20px_rgba(var(--slate-900),0.18)]',
      accent: 'bg-slate-400',
      spark: getCssVar('--tick-color', '#2f3347'),
    },
  };
  const toneSet = tones[tone] || tones.blue;

  return (
    <div className={cx('group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br p-4 shadow-[0_18px_45px_rgba(var(--slate-900),0.07)] ring-1 ring-slate-900/[0.03] transition-shadow duration-300 hover:shadow-[0_22px_55px_rgba(var(--slate-900),0.12)]', toneSet.card)}>
      <div className={cx('absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100', toneSet.accent)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-normal text-slate-950">{displayValue}</p>
          {trendPct != null ? (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={cx(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
                trendPct > 0 ? 'bg-emerald-100 text-emerald-700' : trendPct < 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500',
              )}>
                {trendPct > 0 ? '↑' : trendPct < 0 ? '↓' : '→'} {Math.round(Math.abs(trendPct))}%
              </span>
              {trendLabel ? <span className="text-[11px] font-medium text-slate-400">{trendLabel}</span> : null}
            </div>
          ) : null}
        </div>
        {Icon ? (
          <div className={cx('rounded-lg p-2.5 transition-transform duration-300 group-hover:-rotate-6', toneSet.icon)}>
            <Icon size={20} />
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-xs font-medium text-slate-500">{helper}</p> : null}
      {trend && trend.length > 1 ? (
        <div className="-mx-1 -mb-1 mt-3 opacity-80 transition group-hover:opacity-100">
          <Sparkline data={trend} color={toneSet.spark} height={36} />
        </div>
      ) : null}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    blue: 'bg-brand-soft text-brand-strong ring-brand-soft',
    emerald: 'bg-success-soft text-success-strong ring-success-line',
    amber: 'bg-warning-soft text-warning-strong ring-warning-line',
    rose: 'bg-danger-soft text-danger-strong ring-danger-line',
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    purple: 'bg-purple-50 text-purple-700 ring-purple-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1', tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, imageUrl, size = 40, status, className = '' }) {
  const dimension = `${size}px`;

  return (
    <span className={cx('relative inline-flex shrink-0', className)} style={{ width: dimension, height: dimension }}>
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--secondary-strong),var(--bg-dark))] text-sm font-black text-white">
        {imageUrl ? <img src={imageUrl} alt={name || ''} className="h-full w-full object-cover" /> : getInitials(name)}
      </span>
      {status === 'online' ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[var(--success)]" />
      ) : null}
    </span>
  );
}

export function ChartPanel({ title, description, action, children, className = '' }) {
  return (
    <section className={cx('surface overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100/80 px-5 py-4">
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const PAGINATION_ELLIPSIS = 'ellipsis';

function buildPaginationPages(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const candidates = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...candidates].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const pages = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) {
      pages.push(PAGINATION_ELLIPSIS);
    }
    pages.push(page);
    previous = page;
  }

  return pages;
}

export function Pagination({ page, totalPages, onPageChange, className = '' }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  function changePage(next) {
    onPageChange(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return (
    <div className={cx('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        className="icon-btn"
        disabled={page <= 1}
        onClick={() => changePage(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {buildPaginationPages(page, totalPages).map((entry, index) => (
        entry === PAGINATION_ELLIPSIS ? (
          <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className={cx(
              'h-9 min-w-[2.25rem] rounded-full px-3 text-sm font-semibold transition',
              entry === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
            onClick={() => changePage(entry)}
          >
            {entry}
          </button>
        )
      ))}
      <button
        type="button"
        className="icon-btn"
        disabled={page >= totalPages}
        onClick={() => changePage(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
