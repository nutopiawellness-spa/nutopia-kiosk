// NUtopia Kiosk — offline support (service worker)
// Pagkatapos ng unang bukas habang may internet, naka-store na ang kiosk sa device
// kaya bubukas pa rin ito kahit walang internet. Hindi nito ini-store ang bookings.
const CACHE = "nutopia-kiosk-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Kapag mabagal o walang internet (WiFi na walang signal), gamitin agad ang naka-store na page
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // ang pag-send ng booking ay laging diretso sa internet
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      // Unahin ang bagong version mula sa internet; kapag wala, ang naka-store
      e.respondWith(
        withTimeout(fetch(req), 4000)
          .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
          .catch(() => caches.match("./index.html"))
      );
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }

  // Google Fonts: i-store para pareho ang itsura kahit offline
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      c.put(req, res.clone()); return res;
    }))));
  }
});
