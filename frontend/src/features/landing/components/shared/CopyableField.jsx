import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyableField({ icon: Icon, label, value, wrapperClassName, iconClassName, valueClassName }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors (e.g. unsupported browser)
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={`group ${wrapperClassName}`}>
      <span className={iconClassName}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="landing-demo-label">{label}</span>
        <strong className={valueClassName}>{value}</strong>
      </span>
      <span className={copied ? 'shrink-0 text-[var(--success)]' : 'shrink-0 text-slate-400 transition group-hover:text-[var(--brand-strong)]'}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </span>
    </button>
  );
}
