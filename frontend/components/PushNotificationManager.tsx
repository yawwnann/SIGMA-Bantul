"use client";

import { useEffect } from "react";
import apiClient from "@/api/client";
import { toast } from "sonner";
import { Bell, AlertTriangle } from "lucide-react";

// Use the public key from backend .env - MUST match exactly!
const publicVapidKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BN6PVZlf6sNZmFrHqW0iw7A4fPoXxFPb5buMkL8AsFTSvErOywZDl3VKlKX8bDRghDTqMlOkYgDE8G3deudYLpQ";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  useEffect(() => {
    async function setupPush() {
      if (!("serviceWorker" in navigator && "PushManager" in window)) {
        console.warn("Push notifications not supported in this browser");
        return;
      }

      try {
        // Step 1: Register Service Worker
        console.log("Registering service worker...");
        const register = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check registration status
        if (!register.active) {
          console.warn("Service worker not active yet, waiting...");
        }

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
        console.log("Service worker ready");

        // Step 2: Check existing subscription
        const existingSub = await register.pushManager.getSubscription();
        if (existingSub) {
          console.log("Existing subscription found, re-registering...");
          const response = await apiClient.post(
            "/notifications/subscribe",
            existingSub,
          );
          if (response) {
            toast.success("Notifikasi darurat telah aktif.", { icon: <Bell className="w-4 h-4" /> });
          }
          return;
        }

        // Step 3: Request permission
        const permission = await Notification.requestPermission();
        console.log("Notification permission:", permission);

        if (permission === "denied") {
          toast.error(
            "Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.",
            {
              icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
              duration: 5000,
            },
          );
          return;
        }

        if (permission === "default") {
          console.log("User dismissed the permission prompt");
          return;
        }

        // Step 4: Subscribe to push
        console.log("Subscribing to push notifications...");
        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });

        console.log("Push subscription created:", subscription.endpoint);

        // Step 5: Send subscription to backend
        const response = await apiClient.post(
          "/notifications/subscribe",
          subscription,
        );
        console.log("Subscription saved to backend:", response);

        if (response) {
          toast.success("Notifikasi darurat telah aktif!", { icon: <Bell className="w-4 h-4" /> });
        }
      } catch (err) {
        console.error("Error setting up push notifications:", err);

        if (err instanceof DOMException && err.name === "AbortError") {
          console.warn("Push subscription request timed out or was aborted");
          return;
        }

        // Check for specific error types
        if (err instanceof Error) {
          if (err.message.includes("Permission denied")) {
            toast.error("Izin notifikasi ditolak.", { icon: <AlertTriangle className="w-4 h-4 text-red-500" /> });
          } else if (
            err.name === "NetworkError" ||
            err.message.includes("Network Error")
          ) {
            console.warn(
              "Network error - push notifications unavailable while offline or backend not running",
            );
          } else {
            console.warn(`Push setup error: ${err.message}`);
          }
        } else {
          console.warn("Unknown error setting up push:", err);
        }
      }
    }

    setupPush();

    // Dengarkan pesan "PUSH_RECEIVED" langsung dari ServiceWorker jika web sedang aktif/terbuka
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_RECEIVED") {
        toast.error(event.data.title, {
          description: event.data.body,
          action: {
            label: "Lihat Cepat",
            onClick: () => window.open(event.data.url, "_blank"),
          },
          duration: 10000,
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
        });
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, []);

  return null;
}
