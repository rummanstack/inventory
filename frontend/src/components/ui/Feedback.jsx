import { AlertTriangle, CheckCircle2, Info, Loader2, PackageOpen, X } from 'lucide-react';
import { useInventoryApp } from '../../app/useInventoryApp.jsx';
import { cx } from './utils.js';

export function EmptyState({ title = 'No data found', description = 'Add records to see them here.', icon: Icon = PackageOpen }) {
  const { t } = useInventoryApp();
  const resolvedTitle = title === 'No data found' ? t('common.noData') : title;
  const resolvedDescription = description === 'Add records to see them here.' ? t('common.addRecords') : description;

  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <div className="rounded-2xl bg-white p-3 text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{resolvedTitle}</h3>
      <p className="mt-1 max-w-md text-sm font-medium text-slate-500">{resolvedDescription}</p>
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  const tones = {
    info: 'border-brand-soft bg-brand-soft text-brand-strong',
    success: 'border-success-line bg-success-soft text-success-strong',
    warning: 'border-warning-line bg-warning-soft text-warning-strong',
    error: 'border-danger-line bg-danger-soft text-danger-strong',
  };

  return <div className={cx('rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_10px_22px_rgba(15,23,42,0.04)]', tones[type] || tones.info)}>{children}</div>;
}

export function LoadingState({ title, description, compact = false }) {
  return (
    <div className={cx('panel relative overflow-hidden', compact ? 'min-h-32 p-4' : 'min-h-64 p-6')}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.08),transparent_35%)]" />
        <div className="relative flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--secondary-strong),var(--bg-dark))] text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]">
          <Loader2 size={22} className="animate-spin" />
        </div>
        <div className="mt-5 grid w-full max-w-sm gap-2">
          <div className={cx('mx-auto h-3 rounded-full bg-slate-200/90', compact ? 'w-2/3' : 'w-3/4')} />
          <div className="mx-auto h-2.5 w-1/2 rounded-full bg-slate-200/80" />
          <div className="mx-auto h-2.5 w-5/6 rounded-full bg-slate-100" />
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
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
      {showHeader ? (
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200" />
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
                      className="h-4 animate-pulse rounded-full bg-slate-200"
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
      shell: 'border-success-line bg-[linear-gradient(135deg,rgba(255,255,255,0.98),var(--success-soft))] text-success-strong',
      icon: 'bg-success text-white shadow-[0_10px_24px_var(--success-line)]',
      bar: 'bg-success',
    },
    error: {
      shell: 'border-danger-line bg-[linear-gradient(135deg,rgba(255,255,255,0.98),var(--danger-soft))] text-danger-strong',
      icon: 'bg-danger text-white shadow-[0_10px_24px_var(--danger-line)]',
      bar: 'bg-danger',
    },
    warning: {
      shell: 'border-warning-line bg-[linear-gradient(135deg,rgba(255,255,255,0.98),var(--warning-soft))] text-warning-strong',
      icon: 'bg-warning text-white shadow-[0_10px_24px_var(--warning-line)]',
      bar: 'bg-warning',
    },
    info: {
      shell: 'border-brand-soft bg-[linear-gradient(135deg,rgba(255,255,255,0.98),var(--brand-soft))] text-slate-950',
      icon: 'bg-brand text-white shadow-[0_10px_24px_var(--brand-soft)]',
      bar: 'bg-brand',
    },
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3 no-print">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        const tone = tones[toast.type] || tones.info;
        return (
          <div key={toast.id} className={cx('pointer-events-auto overflow-hidden rounded-[28px] border shadow-[0_24px_50px_rgba(15,23,42,0.14)] backdrop-blur', tone.shell)}>
            <div className={cx('h-1.5 w-full', tone.bar)} />
            <div className="relative flex items-start gap-3 px-4 py-4">
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/50 blur-2xl" />
              <div className={cx('relative mt-0.5 rounded-2xl p-2.5', tone.icon)}>
                <Icon size={18} strokeWidth={2.4} />
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="text-sm font-black tracking-tight">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900"
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
