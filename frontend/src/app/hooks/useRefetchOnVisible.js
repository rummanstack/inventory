import { useEffect, useRef } from 'react';

export function useRefetchOnVisible(refresh) {
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    let last = 0;

    function trigger() {
      const now = Date.now();
      if (now - last > 1000) {
        last = now;
        refreshRef.current?.();
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') trigger();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', trigger);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', trigger);
    };
  }, []);
}
