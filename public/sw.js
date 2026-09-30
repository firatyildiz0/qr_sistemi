/*
 * RentQR service worker — yalnızca telefon bildirimleri için.
 *
 * Önbellek ya da çevrimdışı çalışma yok; bilerek. Tek görevi sunucudan gelen
 * bildirimi göstermek ve dokunulunca paneli doğru ekranda açmak.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let veri = {};
  try {
    veri = event.data ? event.data.json() : {};
  } catch {
    veri = { body: event.data ? event.data.text() : "" };
  }

  const baslik = veri.title || "RentQR";
  event.waitUntil(
    self.registration.showNotification(baslik, {
      body: veri.body || "",
      icon: "/icons/icon-192.png",
      tag: veri.tag,
      renotify: Boolean(veri.tag),
      vibrate: [120, 60, 120],
      data: { url: veri.url || "/admin/notifications" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const hedef = new URL(event.notification.data?.url || "/admin", self.location.origin).href;

  event.waitUntil(
    (async () => {
      // Panel zaten açıksa yeni sekme açmak yerine onu öne getir.
      const pencereler = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const p of pencereler) {
        if (new URL(p.url).origin === self.location.origin && "focus" in p) {
          await p.focus();
          if ("navigate" in p) await p.navigate(hedef);
          return;
        }
      }
      await self.clients.openWindow(hedef);
    })()
  );
});
