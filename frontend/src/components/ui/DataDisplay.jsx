import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCssVar } from '../../utils/theme.js';
import { Sparkline } from './charts.jsx';
import { cx } from './utils.js';

export function SectionHeader({ eyebrow, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="brand-chip">
            {eyebrow}
          </p>
        ) : null}
        {description ? <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function StatCard({ title, value, helper, icon: Icon, tone = 'blue', trend }) {
  const tones = {
    blue: {
      card: 'from-white to-[var(--secondary-soft)]',
      icon: 'bg-[var(--secondary)] text-white shadow-[0_10px_20px_var(--secondary-shadow)]',
      accent: 'bg-[var(--secondary-strong)]',
      spark: getCssVar('--secondary', '#2563eb'),
    },
    emerald: {
      card: 'from-white to-emerald-50/75',
      icon: 'bg-emerald-600 text-white shadow-[0_10px_20px_rgba(5,150,105,0.24)]',
      accent: 'bg-emerald-500',
      spark: '#059669',
    },
    amber: {
      card: 'from-white to-amber-50/80',
      icon: 'bg-amber-500 text-white shadow-[0_10px_20px_rgba(245,158,11,0.22)]',
      accent: 'bg-amber-400',
      spark: '#f59e0b',
    },
    indigo: {
      card: 'from-white to-indigo-50/75',
      icon: 'bg-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)]',
      accent: 'bg-indigo-500',
      spark: '#4f46e5',
    },
    rose: {
      card: 'from-white to-rose-50/75',
      icon: 'bg-rose-600 text-white shadow-[0_10px_20px_rgba(225,29,72,0.22)]',
      accent: 'bg-rose-500',
      spark: '#e11d48',
    },
    slate: {
      card: 'from-white to-slate-100/80',
      icon: 'bg-slate-800 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]',
      accent: 'bg-slate-400',
      spark: '#475569',
    },
  };
  const toneSet = tones[tone] || tones.blue;

  return (
    <div className={cx('group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.03] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.11)]', toneSet.card)}>
      <div className={cx('absolute inset-x-0 top-0 h-1', toneSet.accent)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-normal text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <div className={cx('rounded-lg p-2.5 transition group-hover:scale-105', toneSet.icon)}>
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
    blue: 'bg-[var(--secondary-soft)] text-[var(--secondary-strong)] ring-[var(--secondary-soft)]',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
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

  return (
    <div className={cx('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        className="icon-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
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
            onClick={() => onPageChange(entry)}
          >
            {entry}
          </button>
        )
      ))}
      <button
        type="button"
        className="icon-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
