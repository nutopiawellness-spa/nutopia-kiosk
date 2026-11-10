// NUtopia Kiosk — offline support (service worker) v4
// Laging inuuna ang PINAKABAGONG version mula sa internet.
// Ang naka-save na kopya ay gagamitin lang kapag talagang walang internet.
const CACHE = "nutopia-kiosk-v11";
const CORE = ["./", "./index.html", "./menu.html", "./services.js", "./availability.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  // Burahin ang lahat ng lumang kopya (v3 pababa)
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
  });
}
function pageKey(url) { // bawat page may sariling naka-save na kopya
  const p = url.pathname.replace(/\/$/, "/index.html");
  return new Request(url.origin + p);
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // bookings: laging diretso sa internet
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === "navigate" || /\.html$/.test(url.pathname)) {
      // Pages: internet muna (hindi gagamit ng lumang browser cache); naka-save lang kapag walang internet
      const key = pageKey(url);
      e.respondWith(
        withTimeout(fetch(req, { cache: "no-store" }), 10000)
          .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); } return res; })
          .catch(() => caches.match(key).then(hit => hit || caches.match("./index.html")))
      );
      return;
    }
    // Icons/images: ipakita agad ang naka-save, pero i-update sa background
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      c.put(req, res.clone()); return res;
    }))));
  }
});
