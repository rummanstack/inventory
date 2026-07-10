import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useInventoryApp } from '../../app/useInventoryApp.jsx';
import { cx } from './utils.js';

export function CopyableText({
  value,
  displayValue,
  copyLabel,
  className = '',
  textClassName = '',
  buttonClassName = '',
  emptyFallback = '-',
  iconOnly = false,
}) {
  const { t } = useInventoryApp();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  if (value === undefined || value === null || value === '') {
    return <span className={textClassName}>{emptyFallback}</span>;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures in unsupported browsers.
    }
  }

  const resolvedDisplayValue = displayValue ?? value;
  const actionLabel = copied ? t('common.copied') : t('common.copy');
  const title = copyLabel ? `${actionLabel} ${copyLabel}` : actionLabel;

  return (
    <span className={cx('inline-flex min-w-0 items-center gap-1.5 align-middle', className)}>
      {iconOnly ? null : (
        <span className={cx('min-w-0 truncate', textClassName)} title={String(resolvedDisplayValue)}>
          {resolvedDisplayValue}
        </span>
      )}
      <button
        type="button"
        className={cx(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700',
          copied && 'text-emerald-600 hover:text-emerald-700',
          buttonClassName,
        )}
        onClick={handleCopy}
        title={title}
        aria-label={title}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </span>
  );
}
