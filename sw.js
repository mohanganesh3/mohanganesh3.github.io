// Serves the decrypted site from this browser's cache once the token page has unlocked it.
// Nothing is decrypted here; without an unlocked cache every request falls through to the host (token page or 404).
const CACHE = "sealed-site";
const MAX_AGE_MS = 14 * 24 * 3600 * 1000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js" || url.pathname === "/bundle.bin") return;
  event.respondWith(serve(event.request, url));
});

async function serve(request, url) {
  if (url.searchParams.has("lock")) {
    await caches.delete(CACHE);
    return fetch("/index.html", { cache: "no-store" });
  }
  const cache = await caches.open(CACHE);
  const stamp = await cache.match("/__sealed__");
  if (!stamp || Date.now() - Number(await stamp.text()) > MAX_AGE_MS) {
    await caches.delete(CACHE);
    return fetch(request);
  }
  const path = decodeURIComponent(url.pathname);
  const candidates = path.endsWith("/") ? [path + "index.html"] : [path, path + "/index.html"];
  for (const candidate of candidates) {
    const hit = await cache.match(candidate);
    if (hit) return hit;
  }
  return fetch(request);
}
