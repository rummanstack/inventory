// The permission and feature caches are plain in-memory Maps loaded at boot
// and updated by whichever instance handles a write. Any OTHER instance (Vercel
// runs several) would otherwise serve stale access data forever. This module
// re-reads both caches from the DB at most once per TTL, piggybacking on
// normal reads — fire-and-forget, so no request ever waits on the refresh.
const TTL_MS = 60_000;

let pool = null;
let lastLoadedAt = 0;
let refreshing = false;
const loaders = [];

export function registerAccessCacheLoader(loader) {
  loaders.push(loader);
}

export function registerAccessCachePool(dbPool) {
  pool = dbPool;
  lastLoadedAt = Date.now();
}

export function refreshAccessCachesIfStale() {
  if (!pool || refreshing || Date.now() - lastLoadedAt < TTL_MS) {
    return;
  }
  refreshing = true;
  Promise.all(loaders.map((load) => load(pool)))
    .then(() => {
      lastLoadedAt = Date.now();
    })
    .catch(() => {
      // Transient DB hiccup: keep serving the current cache, retry on a later read.
    })
    .finally(() => {
      refreshing = false;
    });
}
