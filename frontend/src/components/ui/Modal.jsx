import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useInventoryApp } from '../../app/useInventoryApp.jsx';
import { cx } from './utils.js';

export function Modal({ title, description, children, onClose, width = 'max-w-2xl' }) {
  const { t } = useInventoryApp();

  // ESC to close
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[10px] no-print"
      onClick={onClose}
    >
      <div
        className={cx('panel-strong modal-enter w-full overflow-hidden shadow-modal', width)}
        onClick={(e) => e.stopPropagation()}
      >
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
  consequences = [],
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
    if (open) setReason('');
  }, [open]);

  // ESC to cancel
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const toneIcon = {
    rose: AlertTriangle,
    amber: AlertTriangle,
    blue: Info,
    emerald: CheckCircle2,
    slate: Info,
  };
  const toneButton = {
    rose: 'bg-rose-600 text-white shadow-[0_1px_2px_rgba(var(--rose-600),0.22)] hover:bg-rose-700 focus:ring-rose-100',
    amber: 'bg-amber-500 text-white shadow-[0_1px_2px_rgba(var(--amber-500),0.22)] hover:bg-amber-600 focus:ring-amber-100',
    blue: 'bg-[var(--secondary)] text-white shadow-[0_1px_2px_var(--secondary-shadow)] hover:bg-[var(--secondary-strong)] focus:ring-[var(--secondary-soft)]',
    emerald: 'bg-emerald-600 text-white shadow-[0_1px_2px_rgba(var(--emerald-600),0.22)] hover:bg-emerald-700 focus:ring-emerald-100',
    slate: 'bg-slate-800 text-white shadow-[0_1px_2px_rgba(var(--slate-900),0.18)] hover:bg-slate-900 focus:ring-slate-100',
  };
  const Icon = toneIcon[tone] || toneIcon.rose;

  const consequenceTextColor = {
    danger: 'text-rose-700',
    warn:   'text-amber-700',
    safe:   'text-emerald-700',
    info:   'text-slate-600',
  };
  const consequenceDotColor = {
    danger: 'bg-rose-500',
    warn:   'bg-amber-400',
    safe:   'bg-emerald-500',
    info:   'bg-slate-400',
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[10px] no-print"
      onClick={onCancel}
    >
      <div
        className="panel-strong modal-enter w-full max-w-lg overflow-hidden shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
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

          {consequences.length > 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">What happens</p>
              <ul className="space-y-1.5">
                {consequences.map((c, i) => (
                  <li
                    key={i}
                    className={cx(
                      'flex items-start gap-2 text-xs font-semibold leading-5',
                      consequenceTextColor[c.variant] || consequenceTextColor.info,
                    )}
                  >
                    <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', consequenceDotColor[c.variant] || consequenceDotColor.info)} />
                    {c.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
