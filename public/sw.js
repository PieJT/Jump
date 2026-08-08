// Bump this whenever you ship a new build so old caches get cleared out.
const CACHE_VERSION = "jump-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192-jump.png", "/icons/icon-512-jump.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // Don't fail install just because one shell asset couldn't be pre-cached
      // (e.g. offline first install) — the app will still work, just without
      // that asset cached ahead of time.
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle simple GETs from our own origin — never intercept the YouTube
  // iframe/API requests, Firebase calls, or the Worker/API routes. Those all
  // need to hit the network live, not be served from a stale cache.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: try the network first so you always get the latest
  // build when online, but fall back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((cached) => cached || Response.error()))
    );
    return;
  }

  // Static assets (JS/CSS/images/icons): serve from cache instantly if we
  // have it, otherwise fetch and stash a copy for next time.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});