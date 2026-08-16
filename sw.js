/* Service Worker für Kopf & Hand
   ------------------------------------------------------------------
   Strategie: Netz zuerst, Cache als Rückfall. Damit ist immer die
   neueste hochgeladene Fassung zu sehen, sobald Internet da ist – und
   ohne Internet funktioniert die zuletzt geladene Fassung weiter.
   Cache zuerst wäre offline schneller, würde aber nach jedem Upload
   eine veraltete Version festhalten.

   Der Garten und die Einstellungen liegen NICHT im Cache, sondern im
   localStorage des Geräts. Ein Cache-Wechsel löscht sie also nicht. */

const CACHE = "kopf-und-hand-v1";
const DATEIEN = ["./", "./index.html", "./manifest.json", "./icon.svg", "./icon-180.png"];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(DATEIEN))
      .catch(() => {})          /* eine fehlende Datei darf die Installation nicht kippen */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const kopie = res.clone();
          caches.open(CACHE).then(c => c.put(req, kopie)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(treffer =>
        treffer || caches.match("./index.html") || caches.match("./")
      ))
  );
});
