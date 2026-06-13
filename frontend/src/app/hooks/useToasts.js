import { useState } from 'react';

function createToastId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  function pushToast(type, title, message = '') {
    const id = createToastId();
    setToasts((current) => [...current, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return { toasts, pushToast, dismissToast };
}
