"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "@/api/client";
import toast from "@/lib/toast-utils";
import { socketService } from "@/lib/socket";
import type { Earthquake } from "@/types";

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

function getEarthquakeNotificationMessage(earthquake: Earthquake): {
  title: string;
  body: string;
  url: string;
} {
  const magnitude = Number(earthquake.magnitude || 0).toFixed(1);
  const depth = Number(earthquake.depth || 0).toFixed(0);
  const location = earthquake.location || earthquake.region || "wilayah terdekat";

  return {
    title: `Peringatan Gempa M${magnitude}`,
    body: `${location} • Kedalaman ${depth} km. Segera cek info evakuasi.`,
    url: "/?emergency=true",
  };
}

export function PushNotificationManager() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);
  const hasShownBlockedToastRef = useRef(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [showAudioEnableModal, setShowAudioEnableModal] = useState(false);

  const playEmergencyAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    try {
      audio.currentTime = 0;
      audio.volume = 1;
      await audio.play();
      setIsAudioEnabled(true);
      setIsAudioBlocked(false);
      localStorage.setItem("emergency-audio-enabled", "true");
      return true;
    } catch (error) {
      setIsAudioBlocked(true);
      if (!hasShownBlockedToastRef.current) {
        hasShownBlockedToastRef.current = true;
        toast.warning("Alarm darurat diblok browser", {
          description:
            "Tekan tombol Aktifkan Suara Peringatan agar alarm gempa dapat diputar di HP.",
        });
      }
      console.warn("[Audio Alert] Autoplay blocked:", error);
      return false;
    }
  }, []);

  const unlockAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || hasInteractedRef.current) return;

    hasInteractedRef.current = true;
    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      setIsAudioEnabled(true);
      setIsAudioBlocked(false);
      localStorage.setItem("emergency-audio-enabled", "true");
    } catch (error) {
      audio.muted = false;
      setIsAudioBlocked(true);
      console.warn("[Audio Alert] Initial unlock failed:", error);
    }
  }, []);

  const handleEnableAudioClick = useCallback(async () => {
    await unlockAudio();
    const played = await playEmergencyAudio();
    if (played) {
      setShowAudioEnableModal(false);
    }
  }, [playEmergencyAudio, unlockAudio]);

  useEffect(() => {
    const emergencyAudio = new Audio("/notification.mp3");
    emergencyAudio.preload = "auto";
    emergencyAudio.volume = 1;
    audioRef.current = emergencyAudio;

    const persistedAudioState =
      localStorage.getItem("emergency-audio-enabled") === "true";
    if (persistedAudioState) {
      setIsAudioEnabled(true);
      setShowAudioEnableModal(false);
    } else {
      setShowAudioEnableModal(true);
    }

    const firstInteractionEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "touchstart",
      "keydown",
      "click",
    ];
    firstInteractionEvents.forEach((eventName) => {
      window.addEventListener(eventName, unlockAudio, { once: true });
    });

    const triggerLocalVibration = () => {
      if ("vibrate" in navigator) {
        navigator.vibrate([300, 120, 300, 120, 300]);
      }
    };

    const showEmergencyViaServiceWorker = async (
      title: string,
      body: string,
      url: string,
    ) => {
      if (!("serviceWorker" in navigator)) return;
      if (Notification.permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: "SHOW_EARTHQUAKE_NOTIFICATION",
        payload: { title, body, url },
      });
    };

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
            toast.notification.enabled();
          }
          return;
        }

        // Step 3: Request permission
        const permission = await Notification.requestPermission();
        console.log("Notification permission:", permission);

        if (permission === "denied") {
          toast.notification.denied();
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
          toast.notification.enabled();
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
            toast.notification.denied();
          } else if (
            err.name === "NetworkError" ||
            err.message.includes("Network Error")
          ) {
            console.warn(
              "Network error - push notifications unavailable while offline or backend not running",
            );
          } else {
            toast.notification.error();
          }
        } else {
          console.warn("Unknown error setting up push:", err);
          toast.notification.error();
        }
      }
    }

    // Ensure realtime earthquake listener aktif di seluruh aplikasi
    socketService.connect();
    setupPush();

    // Dengarkan pesan "PUSH_RECEIVED" langsung dari ServiceWorker jika web sedang aktif/terbuka
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_RECEIVED") {
        playEmergencyAudio();
        triggerLocalVibration();
        toast.emergency.alert(event.data.title, event.data.body, () => {
          window.location.href = event.data.url;
        });
      }

      // Handle navigation request from service worker (when notification is clicked)
      if (event.data && event.data.type === "NAVIGATE_TO") {
        console.log("[App] Received NAVIGATE_TO message:", event.data.url);
        window.location.href = event.data.url;
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    // Realtime alert ketika backend broadcast event gempa baru
    const unsubscribeEarthquake = socketService.onNewEarthquake((earthquake) => {
      const { title, body, url } = getEarthquakeNotificationMessage(earthquake);
      void playEmergencyAudio();
      triggerLocalVibration();
      toast.emergency.alert(title, body, () => {
        window.location.href = url;
      });
      void showEmergencyViaServiceWorker(title, body, url);
    });

    return () => {
      unsubscribeEarthquake();
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      firstInteractionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, unlockAudio);
      });
      emergencyAudio.pause();
      audioRef.current = null;
    };
  }, [playEmergencyAudio, unlockAudio]);

  return showAudioEnableModal ? (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
          Aktifkan Suara Peringatan Gempa
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">
          Untuk memastikan alarm gempa berbunyi di perangkat mobile, aktifkan
          suara sekali melalui tombol di bawah.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleEnableAudioClick}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Aktifkan Suara Peringatan
          </button>
          <span
            className={`text-xs font-medium ${
              isAudioEnabled
                ? "text-emerald-600 dark:text-emerald-400"
                : isAudioBlocked
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-600 dark:text-zinc-300"
            }`}
          >
            {isAudioEnabled
              ? "Audio aktif"
              : isAudioBlocked
                ? "Perlu interaksi"
                : "Menunggu aktivasi"}
          </span>
        </div>
      </div>
    </div>
  ) : null;
}
