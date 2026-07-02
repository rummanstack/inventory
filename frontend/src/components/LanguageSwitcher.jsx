import { Languages } from 'lucide-react';
import { cx } from './ui.jsx';

export default function LanguageSwitcher({ language, onChange, t, compact = false, tone = 'light' }) {
  const isDark = tone === 'dark';

  return (
    <div
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-1 py-1 sm:gap-2 sm:px-2',
        isDark
          ? 'border border-white/10 bg-[rgba(255,255,255,0.10)] shadow-[0_1px_0_rgba(255,255,255,0.05)]'
          : 'border border-slate-200 bg-white shadow-[0_1px_0_rgba(var(--slate-900),0.03)]',
        compact && 'w-full justify-between',
      )}
    >
      <span
        className={cx(
          'hidden h-8 w-8 items-center justify-center rounded-full sm:inline-flex',
          isDark ? 'bg-[rgba(255,255,255,0.08)] text-slate-200' : 'bg-slate-50 text-slate-400',
        )}
      >
        <Languages size={16} />
      </span>
      <button
        type="button"
        className={cx(
          'h-8 rounded-full px-2 text-xs font-semibold uppercase tracking-[0.14em] transition sm:px-3',
          language === 'en'
            ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]'
            : isDark
              ? 'text-slate-200 hover:text-white'
              : 'text-slate-500 hover:text-slate-900',
        )}
        onClick={() => onChange('en')}
      >
        {t('lang.english')}
      </button>
      <button
        type="button"
        className={cx(
          'h-8 rounded-full px-2 text-xs font-semibold uppercase tracking-[0.14em] transition sm:px-3',
          language === 'bn'
            ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]'
            : isDark
              ? 'text-slate-200 hover:text-white'
              : 'text-slate-500 hover:text-slate-900',
        )}
        onClick={() => onChange('bn')}
      >
        {t('lang.bangla')}
      </button>
    </div>
  );
}
