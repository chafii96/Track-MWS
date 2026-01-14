/* Service Worker: offline cache + IndexedDB collector (client-side) */
const CACHE_NAME = "sa-pwa-v3";
const APP_SHELL = ["/", "/index.html", "/demo.html", "/manifest.webmanifest", "/icons/icon.svg", "/icons/maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache tracking script / service worker itself
  if (url.origin === self.location.origin && (url.pathname === "/sa/insight.js" || url.pathname === "/sw.js")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // Network-first for html (keeps app fresh), cache-first for rest.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put("/", fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match("/");
          return cached || caches.match("/index.html");
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        // Cache same-origin static (except tracking script/sw which are handled above).
        if (new URL(req.url).origin === self.location.origin) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        return cached;
      }
    })(),
  );
});

// --- Minimal IndexedDB helpers ---
const DB_NAME = "sa_db";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sites")) {
        const s = db.createObjectStore("sites", { keyPath: "id" });
        s.createIndex("domain", "domain", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("hits")) {
        const h = db.createObjectStore("hits", { keyPath: "id" });
        h.createIndex("siteId", "siteId", { unique: false });
        h.createIndex("ts", "ts", { unique: false });
        h.createIndex("siteId_ts", ["siteId", "ts"], { unique: false });
        h.createIndex("type", "type", { unique: false });
        h.createIndex("url", "url", { unique: false });
        h.createIndex("channel", "channel", { unique: false });
        h.createIndex("browser", "browser", { unique: false });
        h.createIndex("os", "os", { unique: false });
        h.createIndex("deviceType", "deviceType", { unique: false });
        h.createIndex("countryHint", "countryHint", { unique: false });
        h.createIndex("visitorId", "visitorId", { unique: false });
        h.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putHit(hit) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("hits", "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore("hits").put(hit);
  });
}

async function updateHit(id, patch) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("hits", "readwrite");
    const store = tx.objectStore("hits");
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) {
        resolve(false);
        return;
      }
      store.put(Object.assign({}, item, patch));
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg && msg.kind === "SA_HIT") {
    event.waitUntil(putHit(msg.payload));
  }
  if (msg && msg.kind === "SA_HIT_PATCH") {
    event.waitUntil(updateHit(msg.id, msg.patch || {}));
  }
});
