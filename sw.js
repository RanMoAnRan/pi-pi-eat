const CACHE_NAME = "eat-what-pwa-v10";

function assetUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

const ASSETS = [
  assetUrl(""),
  assetUrl("index.html"),
  assetUrl("styles.css"),
  assetUrl("app.js"),
  assetUrl("manifest.webmanifest"),
  assetUrl("icon.svg"),
  assetUrl("offline.html"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigate = request.mode === "navigate";
  if (isNavigate) {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(assetUrl("index.html"), network.clone());
          return network;
        } catch {
          return (
            (await caches.match(assetUrl("index.html"))) ||
            (await caches.match(assetUrl("offline.html"))) ||
            new Response("离线", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } })
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(assetUrl("offline.html"))) || new Response("", { status: 504 });
      }
    })(),
  );
});
