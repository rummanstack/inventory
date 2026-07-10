import { useRef, useState } from 'react';

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  async function run(action) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      await action();
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  return [loading, run];
}
