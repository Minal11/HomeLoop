/* HomeLoop service worker.
 *
 * Purpose:
 * - Satisfy Chromium installability heuristics
 * - Handle Web Push event reminders
 *
 * Strategy: network-only for fetches. No caching of authenticated data.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "HomeLoop",
    body: "You have a family reminder.",
    url: "/",
    eventId: null,
  };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = {
        title: typeof data.title === "string" ? data.title : payload.title,
        body: typeof data.body === "string" ? data.body : payload.body,
        url: typeof data.url === "string" ? data.url : payload.url,
        eventId:
          typeof data.eventId === "string" ? data.eventId : payload.eventId,
      };
    }
  } catch (error) {
    console.warn("HomeLoop push payload parse failed:", error);
  }

  const targetUrl =
    payload.eventId && typeof payload.eventId === "string"
      ? `/events/${payload.eventId}`
      : payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {
        url: targetUrl,
        eventId: payload.eventId,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const absoluteUrl = new URL(targetPath, self.location.origin).href;
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(absoluteUrl);
              return;
            } catch {
              // Fall through to openWindow.
            }
          }
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl);
      }
    })(),
  );
});
