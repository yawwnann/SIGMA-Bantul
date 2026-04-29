self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  console.log("[SW] Push event received:", event);
  console.log("[SW] Push data type:", event.data ? event.data.type : "none");

  let title = "Peringatan Darurat";
  let body = "Silahkan periksa jalur evakuasi Anda.";
  let url = "/?emergency=true";

  try {
    if (event.data) {
      // Try to parse as JSON first
      const textData = event.data.text();
      console.log("[SW] Raw push data:", textData);

      try {
        const jsonData = JSON.parse(textData);
        title = jsonData.title || title;
        body = jsonData.body || body;
        url = jsonData.data?.url || url;
        console.log("[SW] Parsed JSON data:", jsonData);
      } catch (parseErr) {
        // If not JSON, treat as plain text body
        console.log("[SW] Data is plain text, using as body");
        body = textData || body;
      }
    }
  } catch (e) {
    console.error("[SW] Error parsing push data:", e);
  }

  const options = {
    body: body,
    icon: "/logo.png",
    badge: "/logo.png",
    data: { url: url },
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: "earthquake-alert",
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: "view", title: "Lihat Rute" },
      { action: "dismiss", title: "Tutup" },
    ],
  };

  console.log("[SW] Showing notification:", title, body);

  const displayNotificationPromise = self.registration
    .showNotification(title, options)
    .then(() => console.log("[SW] Notification shown successfully"))
    .catch((err) => console.error("[SW] Error showing notification:", err));

  const notifyOpenTabsPromise = clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((windowClients) => {
      for (let client of windowClients) {
        // Kirim pesan ke tab website GIS yang sedang terbuka!
        client.postMessage({
          type: "PUSH_RECEIVED",
          title: title,
          body: body,
          url: options.data.url,
        });
      }
    });

  event.waitUntil(
    Promise.all([displayNotificationPromise, notifyOpenTabsPromise]),
  );
});

self.addEventListener("notificationclick", function (event) {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  // Handle different actions
  if (event.action === "dismiss") {
    return;
  }

  const urlToOpen = new URL(
    event.notification.data?.url || "/?emergency=true",
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        let matchingClient = null;

        // Try to find existing window with matching URL
        for (let i = 0; i < windowClients.length; i++) {
          const windowClient = windowClients[i];
          if (
            windowClient.url.includes(urlToOpen) ||
            urlToOpen.includes(windowClient.url)
          ) {
            matchingClient = windowClient;
            break;
          }
        }

        if (matchingClient) {
          console.log("[SW] Focusing existing window");
          return matchingClient.focus();
        } else {
          console.log("[SW] Opening new window:", urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((err) => {
        console.error("[SW] Error handling notification click:", err);
      }),
  );
});

// Handle notification close (for analytics if needed)
self.addEventListener("notificationclose", function (event) {
  console.log("[SW] Notification closed");
});


// Satisfy PWA requirement for installability
self.addEventListener('fetch', (event) => {});

