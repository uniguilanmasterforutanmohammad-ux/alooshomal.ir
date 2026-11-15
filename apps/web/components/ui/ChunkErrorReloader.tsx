'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'alooshomal:chunk-reload-at';
const RELOAD_GUARD_MS = 15_000;

function isChunkError(value: unknown): boolean {
  const text =
    value instanceof Error
      ? `${value.name} ${value.message}`
      : typeof value === 'string'
        ? value
        : '';
  return /ChunkLoadError|Loading (CSS )?chunk .* failed|Failed to load chunk/i.test(
    text,
  );
}

/**
 * Recovers from a stale deploy: if the browser still holds an old login page
 * (or any page) and a `/_next/static/chunks/...` file has been replaced by a
 * new build, the client-side navigation throws `ChunkLoadError` and the page
 * shows «This page couldn't load». A single full reload fetches the current
 * document and its matching chunks. The guard prevents a reload loop when the
 * failure is not deployment-related.
 */
export function ChunkErrorReloader() {
  useEffect(() => {
    function reloadOnce() {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (Date.now() - last < RELOAD_GUARD_MS) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === 'SCRIPT' &&
        (target as HTMLScriptElement).src.includes('/_next/static/')
      ) {
        reloadOnce();
        return;
      }
      if (isChunkError(event.error) || isChunkError(event.message)) {
        reloadOnce();
      }
    }

    function onRejection(event: PromiseRejectionEvent) {
      if (isChunkError(event.reason)) reloadOnce();
    }

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
