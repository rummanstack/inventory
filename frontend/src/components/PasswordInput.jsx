import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ className = 'input', leftIcon, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {leftIcon}
        </span>
      ) : null}
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`${className} auth-password-input pr-9`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="auth-password-toggle absolute right-3 top-1/2 -translate-y-1/2 rounded-lg text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)]"
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}
