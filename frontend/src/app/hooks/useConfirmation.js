import { useRef, useState } from 'react';

export function useConfirmation(t) {
  const confirmResolverRef = useRef(null);
  const [confirmation, setConfirmation] = useState(null);

  function closeConfirmation(result, reason = '') {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmation(null);
    if (resolver) {
      resolver({ confirmed: Boolean(result), reason });
    }
  }

  function confirm(options) {
    return new Promise((resolve) => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current({ confirmed: false, reason: '' });
      }

      confirmResolverRef.current = resolve;
      setConfirmation({
        title: options.title,
        description: options.description || '',
        confirmLabel: options.confirmLabel || t('common.delete'),
        cancelLabel: options.cancelLabel || t('common.cancel'),
        tone: options.tone || 'rose',
        requireReason: options.requireReason || false,
        reasonLabel: options.reasonLabel,
        reasonPlaceholder: options.reasonPlaceholder,
      });
    });
  }

  return { confirmation, confirm, closeConfirmation };
}
