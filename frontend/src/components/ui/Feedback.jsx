import { AlertTriangle, CheckCircle2, Info, PackageOpen, X } from 'lucide-react';
import { useInventoryApp } from '../../app/useInventoryApp.jsx';
import { cx } from './utils.js';

export function EmptyState({ title = 'No data found', description = 'Add records to see them here.', icon: Icon = PackageOpen }) {
  const { t } = useInventoryApp();
  const resolvedTitle = title === 'No data found' ? t('common.noData') : title;
  const resolvedDescription = description === 'Add records to see them here.' ? t('common.addRecords') : description;

  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-card border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <div className="rounded-control bg-white p-3 text-slate-500 shadow-crisp ring-1 ring-slate-200">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{resolvedTitle}</h3>
      <p className="mt-1 max-w-md text-sm font-medium text-slate-500">{resolvedDescription}</p>
    </div>
  );
}

export function Alert({ type = 'info', className = '', children }) {
  const tones = {
    info: 'border-brand-soft bg-brand-soft text-brand-strong',
    success: 'border-success-line bg-success-soft text-success-strong',
    warning: 'border-warning-line bg-warning-soft text-warning-strong',
    error: 'border-danger-line bg-danger-soft text-danger-strong',
  };

  return (
    <div
      className={cx(
        'rounded-control border px-4 py-3 text-sm font-medium',
        tones[type] || tones.info,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LoadingState({ title, description, compact = false }) {
  return (
    <div className={cx('panel relative overflow-hidden', compact ? 'min-h-32 p-4' : 'min-h-64 p-6')}>
      <div className="relative flex flex-col">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 skeleton rounded-2xl" />
          <div className="min-w-0 flex-1 pt-1">
            <div className={cx('h-4 skeleton rounded-full', compact ? 'w-2/3' : 'w-3/4')} />
            <div className="mt-2 h-3 skeleton rounded-full" />
            <div className="mt-2 h-3 w-1/2 skeleton rounded-full" />
          </div>
        </div>
        <div className="mt-6 grid gap-2">
          <div className={cx('skeleton rounded-2xl', compact ? 'h-8' : 'h-10')} />
          <div className={cx('skeleton rounded-2xl', compact ? 'h-8' : 'h-10')} />
        </div>
        {title ? <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3> : null}
        {description ? <p className="mt-1 max-w-md text-sm font-medium text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

export function PageLoadingState({ title, description }) {
  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <div className="w-full">
          <LoadingState title={title} description={description} />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5, showHeader = true }) {
  return (
    <div className="overflow-hidden rounded-card border border-slate-100 bg-white shadow-card">
      {showHeader ? (
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-48 skeleton rounded-full" />
            <div className="h-8 w-28 skeleton rounded-full" />
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <div className="h-3 w-16 skeleton rounded-full" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-transparent">
                {Array.from({ length: columns }).map((__, colIndex) => (
                  <td key={colIndex} className="table-cell">
                    <div
                      className="h-4 skeleton rounded-full"
                      style={{ width: `${Math.max(34, 76 - colIndex * 8)}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-card border border-slate-200/80 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <div className="h-3 w-2/3 skeleton rounded-full" />
          <div className="mt-3 h-6 w-1/2 skeleton rounded-full" />
          <div className="mt-3 h-2.5 w-3/4 skeleton rounded-full" />
        </div>
        <div className="h-10 w-10 shrink-0 skeleton rounded-control" />
      </div>
    </div>
  );
}

export function ChartPanelSkeleton({ height = 'h-56' }) {
  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-slate-100/80 px-5 py-4">
        <div className="h-4 w-40 skeleton rounded-full" />
        <div className="mt-2 h-2.5 w-56 skeleton rounded-full" />
      </div>
      <div className="p-5">
        <div className={cx('w-full skeleton rounded-2xl', height)} />
      </div>
    </div>
  );
}

export function CardSkeleton({ className = '', height = 'h-24' }) {
  return <div className={cx('skeleton rounded-card', height, className)} />;
}

export function ToastViewport({ toasts, onDismiss }) {
  const { t } = useInventoryApp();
  const icons = {
    success: CheckCircle2,
    error: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  };

  const tones = {
    success: {
      shell: 'border-emerald-200 bg-white text-emerald-900',
      icon: 'bg-emerald-500 text-white',
      bar: 'bg-emerald-500',
      msg: 'text-emerald-700',
    },
    error: {
      shell: 'border-rose-200 bg-white text-rose-900',
      icon: 'bg-rose-500 text-white',
      bar: 'bg-rose-500',
      msg: 'text-rose-700',
    },
    warning: {
      shell: 'border-amber-200 bg-white text-amber-900',
      icon: 'bg-amber-500 text-white',
      bar: 'bg-amber-500',
      msg: 'text-amber-800',
    },
    info: {
      shell: 'border-indigo-200 bg-white text-slate-900',
      icon: 'bg-[var(--brand)] text-white',
      bar: 'bg-[var(--brand)]',
      msg: 'text-slate-600',
    },
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3 no-print">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        const tone = tones[toast.type] || tones.info;
        return (
          <div key={toast.id} className={cx('pointer-events-auto overflow-hidden rounded-card border shadow-modal', tone.shell)}>
            <div className={cx('h-1.5 w-full', tone.bar)} />
            <div className="flex items-start gap-3 px-4 py-4">
              <div className={cx('mt-0.5 shrink-0 rounded-control p-2.5', tone.icon)}>
                <Icon size={18} strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-tight">{toast.title}</p>
                {toast.message ? <p className={cx('mt-1 text-sm font-medium leading-6', tone.msg)}>{toast.message}</p> : null}
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => onDismiss(toast.id)}
                aria-label={t('common.close')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
