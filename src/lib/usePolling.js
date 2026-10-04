import { useEffect, useRef } from 'react';

// Runs load() now and then every `ms` while the page is visible, and straight
// away again when a hidden tab comes back, so a phone that was in a pocket
// shows fresh scores the moment it's opened. A refresh that is still running
// is never started twice. load() is given isActive(), to check before it
// touches the screen, because the page may have closed while it waited.
export function usePolling(load, ms) {
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    let stopped = false;
    let running = false;

    async function run() {
      if (stopped || running) return;
      running = true;
      try {
        await latest.current(() => !stopped);
      } finally {
        running = false;
      }
    }

    run();
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') run();
    }, ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms]);
}
