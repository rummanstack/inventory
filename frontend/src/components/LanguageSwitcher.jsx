import { Languages } from 'lucide-react';
import { cx } from './ui.jsx';

export default function LanguageSwitcher({ language, onChange, t, compact = false, tone = 'light' }) {
  const isDark = tone === 'dark';

  return (
    <div
      className={cx(
        'inline-flex items-center rounded-full',
        compact ? 'h-10 w-24 justify-center gap-0.5 p-1' : 'gap-1 px-1 py-1 sm:gap-2 sm:px-2',
        isDark
          ? 'border border-white/10 bg-[rgba(255,255,255,0.10)] shadow-[0_1px_0_rgba(255,255,255,0.05)]'
          : 'border border-slate-200 bg-white shadow-[0_1px_0_rgba(var(--slate-900),0.03)]',
      )}
    >
      <span
        className={cx(
          compact ? 'hidden' : 'hidden h-8 w-8 items-center justify-center rounded-full sm:inline-flex',
          isDark ? 'bg-[rgba(255,255,255,0.08)] text-slate-200' : 'bg-slate-50 text-slate-400',
        )}
      >
        <Languages size={16} />
      </span>
      <button
        type="button"
        className={cx(
          'rounded-full text-xs font-semibold uppercase transition',
          compact ? 'h-7 min-w-0 flex-1 px-1 tracking-[0.08em]' : 'h-8 px-2 tracking-[0.14em] sm:px-3',
          language === 'en'
            ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]'
            : isDark
              ? 'text-slate-200 hover:text-white'
              : 'text-slate-500 hover:text-slate-900',
        )}
        onClick={() => onChange('en')}
        aria-label={t('lang.english')}
        aria-pressed={language === 'en'}
      >
        {compact ? 'EN' : t('lang.english')}
      </button>
      <button
        type="button"
        className={cx(
          'rounded-full text-xs font-semibold uppercase transition',
          compact ? 'h-7 min-w-0 flex-1 px-1 tracking-[0.08em]' : 'h-8 px-2 tracking-[0.14em] sm:px-3',
          language === 'bn'
            ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]'
            : isDark
              ? 'text-slate-200 hover:text-white'
              : 'text-slate-500 hover:text-slate-900',
        )}
        onClick={() => onChange('bn')}
        aria-label={t('lang.bangla')}
        aria-pressed={language === 'bn'}
      >
        {compact ? 'BN' : t('lang.bangla')}
      </button>
    </div>
  );
}
