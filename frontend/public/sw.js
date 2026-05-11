self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function buildEarthquakeNotificationOptions({
  body,
  url,
  icon,
  badge,
  tag,
  vibrate,
}) {
  return {
    body: body || "Silahkan periksa jalur evakuasi Anda.",
    icon: icon || "/logo.png",
    badge: badge || "/logo.png",
    data: { url: url || "/?emergency=true" },
    // Vibrate pattern emergency alert
    vibrate: vibrate || [200, 100, 200, 100, 200, 100, 200],
    tag: tag || "earthquake-alert",
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: "view", title: "Lihat Rute" },
      { action: "dismiss", title: "Tutup" },
    ],
  };
}

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

  const options = buildEarthquakeNotificationOptions({
    body,
    url,
  });

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
    console.log("[SW] Notification dismissed by user");
    return;
  }

  // Get the URL to open from notification data
  const urlToOpen = new URL(
    event.notification.data?.url || "/?emergency=true",
    self.location.origin,
  ).href;

  console.log("[SW] URL to open:", urlToOpen);

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        console.log("[SW] Found", windowClients.length, "open window(s)");

        // Strategy 1: Try to find and focus existing app window
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen);

          // Check if it's our app (same origin)
          if (clientUrl.origin === targetUrl.origin) {
            console.log(
              "[SW] Found existing app window, attempting to navigate",
            );

            // Try to navigate if supported
            if (client.navigate) {
              return client
                .navigate(urlToOpen)
                .then((navigatedClient) => {
                  console.log("[SW] Navigation successful, focusing window");
                  return navigatedClient
                    ? navigatedClient.focus()
                    : client.focus();
                })
                .catch((navError) => {
                  console.warn(
                    "[SW] Navigate failed, trying postMessage:",
                    navError,
                  );
                  // Fallback: send message to client to navigate itself
                  client.postMessage({
                    type: "NAVIGATE_TO",
                    url: urlToOpen,
                  });
                  return client.focus();
                });
            } else {
              // Navigate not supported, use postMessage
              console.log("[SW] Navigate not supported, using postMessage");
              client.postMessage({
                type: "NAVIGATE_TO",
                url: urlToOpen,
              });
              return client.focus();
            }
          }
        }

        // Strategy 2: No existing window found, open new one
        console.log("[SW] No existing app window found, opening new window");
        return clients.openWindow(urlToOpen);
      })
      .catch((err) => {
        console.error("[SW] Error handling notification click:", err);
        // Final fallback: try to open window anyway
        return clients.openWindow(urlToOpen).catch((openErr) => {
          console.error("[SW] Failed to open window:", openErr);
        });
      }),
  );
});

// Handle notification close (for analytics if needed)
self.addEventListener("notificationclose", function (event) {
  console.log("[SW] Notification closed");
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "SHOW_EARTHQUAKE_NOTIFICATION") return;

  const payload = event.data.payload || {};
  const title = payload.title || "Peringatan Gempa";
  const options = buildEarthquakeNotificationOptions({
    body: payload.body,
    url: payload.url,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag || "earthquake-alert-foreground",
    vibrate: [300, 120, 300, 120, 300],
  });

  event.waitUntil(self.registration.showNotification(title, options));
});

// Satisfy PWA requirement for installability
self.addEventListener("fetch", (event) => {});
