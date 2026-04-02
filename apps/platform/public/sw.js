// GoGreen Service Worker v13 — Push Notifications + Offline Photo Queue + Cache
const CACHE_NAME = "gogreen-v13";
const STATIC_ASSETS = ["/images/cropped-Mobile-Logo-164x76.png", "/manifest.json"];
const PHOTO_QUEUE = "photo-upload-queue";

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Fetch — network-first for HTML, cache-first for assets
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  } else {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Go Green Organic Clean", {
      body: data.body || "You have a new notification",
      icon: "/images/cropped-Mobile-Logo-164x76.png",
      badge: "/images/cropped-Mobile-Logo-164x76.png",
      tag: data.tag || "gogreen",
      data: { url: data.url || "/cleaner" },
      vibrate: [100, 50, 100],
    })
  );
});

// Notification click — open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/cleaner";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && "focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Background sync for offline photo uploads
self.addEventListener("sync", (event) => {
  if (event.tag === "photo-upload") event.waitUntil(processPhotoQueue());
});

async function processPhotoQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(PHOTO_QUEUE, "readonly");
    const items = await storeGetAll(tx.objectStore(PHOTO_QUEUE));
    for (const item of items) {
      try {
        const res = await fetch("/api/photos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.data),
        });
        if (res.ok) {
          const delTx = db.transaction(PHOTO_QUEUE, "readwrite");
          delTx.objectStore(PHOTO_QUEUE).delete(item.id);
        }
      } catch { /* retry on next sync */ }
    }
  } catch (e) { console.warn("[SW] photo queue error:", e); }
}

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("gogreen-offline", 1);
    r.onupgradeneeded = () => r.result.createObjectStore(PHOTO_QUEUE, { keyPath: "id", autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function storeGetAll(store) {
  return new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
