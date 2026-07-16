import { useEffect, useRef } from 'react';

export function usePolling(callback, intervalMs, { enabled = true } = {}) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;
    function tick() {
      if (!cancelled && document.visibilityState === 'visible') {
        callbackRef.current();
      }
    }

    tick();
    const intervalId = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [intervalMs, enabled]);
}
