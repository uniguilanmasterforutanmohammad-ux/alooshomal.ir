'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Global "you are offline" strip. It listens to the browser's connectivity
 * events (`online`/`offline`) plus a light periodic check of
 * `navigator.onLine`, so a dropped connection shows a friendly prompt at the
 * top of the page instead of failing requests silently.
 *
 * It deliberately does NOT ping the API on every tick — `navigator.onLine` is
 * free — so it never adds load to the server.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    const timer = setInterval(update, 5000);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      clearInterval(timer);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[110] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-bold text-white shadow-lg"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>وضعیت اینترنت خود را بررسی نمایید</span>
    </div>
  );
}
