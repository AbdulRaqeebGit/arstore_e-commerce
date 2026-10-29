/* Service worker: network-first for app files (so updates
   always show), cache fallback for offline. Never caches the API. */
const CACHE = "arstore-v6";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/config.js",
  "./js/utils.js",
  "./js/supabase.js",
  "./js/store.js",
  "./js/auth.js",
  "./js/ai.js",
  "./js/lens.js",
  "./js/cloud.js",
  "./js/imagegen.js",
  "./js/views.js",
  "./js/ui.js",
  "./js/app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.pathname.indexOf("/api/") === 0) return; // never cache API

  // App files: network-first → always fresh; fall back to cache offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request).then((resp) => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // External (Bootstrap, Leaflet, product photos, AI images):
  // cache-first, then network + cache on success.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const net = fetch(e.request).then((resp) => {
        if (resp && (resp.ok || resp.type === "opaque")) {
          const clone = resp.clone();
          caches.open(CACHE + "-ext").then((c) => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
