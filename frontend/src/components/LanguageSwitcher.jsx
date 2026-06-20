import { Languages } from 'lucide-react';
import { cx } from './ui.jsx';

export default function LanguageSwitcher({ language, onChange, t, compact = false }) {
  return (
    <div className={cx('inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 shadow-[0_1px_0_rgba(var(--slate-900),0.03)] sm:gap-2 sm:px-2', compact && 'w-full justify-between')}>
      <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 sm:inline-flex">
        <Languages size={16} />
      </span>
      <button
        type="button"
        className={cx('h-8 rounded-full px-2 text-xs font-black uppercase tracking-[0.14em] transition sm:px-3', language === 'en' ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]' : 'text-slate-500 hover:text-slate-900')}
        onClick={() => onChange('en')}
      >
        {t('lang.english')}
      </button>
      <button
        type="button"
        className={cx('h-8 rounded-full px-2 text-xs font-black uppercase tracking-[0.14em] transition sm:px-3', language === 'bn' ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]' : 'text-slate-500 hover:text-slate-900')}
        onClick={() => onChange('bn')}
      >
        {t('lang.bangla')}
      </button>
    </div>
  );
}
