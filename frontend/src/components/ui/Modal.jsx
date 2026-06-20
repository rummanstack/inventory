import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInventoryApp } from '../../app/useInventoryApp.jsx';
import { cx } from './utils.js';

export function Modal({ title, description, children, onClose, width = 'max-w-2xl' }) {
  const { t } = useInventoryApp();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[10px] no-print">
      <div className={cx('panel-strong w-full overflow-hidden', width)}>
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button type="button" className="icon-btn" title={t('common.close')} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'rose',
  onConfirm,
  onCancel,
  requireReason = false,
  reasonLabel,
  reasonPlaceholder,
}) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-[var(--muted)] bg-[var(--secondary-soft)] text-[var(--secondary-strong)]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const toneIcon = {
    rose: AlertTriangle,
    amber: AlertTriangle,
    blue: Info,
    emerald: CheckCircle2,
    slate: Info,
  };
  const toneButton = {
    rose: 'bg-rose-600 text-white shadow-[0_14px_28px_rgba(var(--rose-600),0.22)] hover:bg-rose-700 focus:ring-rose-100',
    amber: 'bg-amber-500 text-white shadow-[0_14px_28px_rgba(var(--amber-500),0.22)] hover:bg-amber-600 focus:ring-amber-100',
    blue: 'bg-[var(--secondary)] text-white shadow-[0_14px_28px_var(--secondary-shadow)] hover:bg-[var(--secondary-strong)] focus:ring-[var(--secondary-soft)]',
    emerald: 'bg-emerald-600 text-white shadow-[0_14px_28px_rgba(var(--emerald-600),0.22)] hover:bg-emerald-700 focus:ring-emerald-100',
    slate: 'bg-slate-800 text-white shadow-[0_14px_28px_rgba(var(--slate-900),0.18)] hover:bg-slate-900 focus:ring-slate-100',
  };
  const Icon = toneIcon[tone] || toneIcon.rose;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[10px] no-print">
      <div className="panel-strong w-full max-w-lg overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className={cx('rounded-2xl p-2.5', tones[tone] || tones.rose)}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className={cx('inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em]', tones[tone] || tones.rose)}>
                {title}
              </span>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{description}</p>
            </div>
          </div>
          {requireReason ? (
            <div className="mt-4">
              {reasonLabel ? <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{reasonLabel}</label> : null}
              <textarea
                className="input min-h-[80px] w-full resize-y"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={reasonPlaceholder}
              />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={cx('btn-primary', toneButton[tone] || toneButton.rose)} onClick={() => onConfirm(reason)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
