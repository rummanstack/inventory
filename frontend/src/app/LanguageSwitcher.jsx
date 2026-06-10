import { Languages } from 'lucide-react';
import { cx } from '../components/ui.jsx';

export default function LanguageSwitcher({ language, onChange, t, compact = false }) {
  return (
    <div className={cx('inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-[0_1px_0_rgba(15,23,42,0.03)]', compact && 'w-full justify-between')}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Languages size={16} />
      </span>
      <button
        type="button"
        className={cx('h-8 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] transition', language === 'en' ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]' : 'text-slate-500 hover:text-slate-900')}
        onClick={() => onChange('en')}
      >
        {t('lang.english')}
      </button>
      <button
        type="button"
        className={cx('h-8 rounded-full px-3 text-xs font-black uppercase tracking-[0.14em] transition', language === 'bn' ? 'bg-[var(--secondary)] text-white shadow-[0_10px_18px_var(--secondary-shadow)]' : 'text-slate-500 hover:text-slate-900')}
        onClick={() => onChange('bn')}
      >
        {t('lang.bangla')}
      </button>
    </div>
  );
}
