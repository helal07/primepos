import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-at";

/**
 * Wraps React.lazy so that a stale/missing chunk (typical after a new deploy,
 * when the browser still holds an old index.js referencing old asset hashes)
 * retries once and then force-reloads the page instead of showing a blank screen.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // Second attempt — covers transient network failures.
      try {
        return await factory();
      } catch (err2) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        // Only reload once per 10s to avoid infinite reload loops.
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // Never resolves; the page is reloading.
          return await new Promise<{ default: T }>(() => {});
        }
        throw err2;
      }
    }
  });
}
