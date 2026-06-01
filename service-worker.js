const SW_VERSION = "2026-05-31.2";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  // Keep this worker install-focused. Firebase provides shared live state, and
  // app freshness is handled by the existing versioned asset URLs/cache toggle.
  event.respondWith(fetch(event.request));
});
