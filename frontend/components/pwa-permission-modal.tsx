"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api/client";

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

export function PwaPermissionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const checkPermissions = async () => {
      // 1. Check if running as PWA (Standalone mode)
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || 
                           (window.navigator as any).standalone === true;
      
      // If not PWA, we might still want to ask, but user specified "ketika di install di hp pwa mode"
      // Let's only show it in standalone mode OR if we haven't asked before on mobile
      const hasAskedBefore = localStorage.getItem("pwa_permission_asked");
      
      if (isStandalone && !hasAskedBefore) {
        // Check current notification status
        const notifStatus = Notification.permission;
        
        // Check current GPS status
        let gpsStatus = "prompt";
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const gpsPerm = await navigator.permissions.query({ name: "geolocation" });
            gpsStatus = gpsPerm.state;
          } catch (e) {
            console.warn("Permission API not supported", e);
          }
        }

        // Show modal if either is not granted (and not permanently denied)
        if (notifStatus === "default" || gpsStatus === "prompt") {
          setIsOpen(true);
        } else {
          // If they already decided (granted or denied), remember it
          localStorage.setItem("pwa_permission_asked", "true");
        }
      }
    };

    // Delay checking slightly to ensure UI is ready
    setTimeout(checkPermissions, 1000);
  }, []);

  const requestPermissions = async () => {
    setLoading(true);
    try {
      // 1. Request Notification Permission (Must be triggered by user gesture)
      if (Notification.permission === "default") {
        const notifPerm = await Notification.requestPermission();
        if (notifPerm === "granted") {
          toast.success("Izin notifikasi diberikan");
          
          // Setup push subscription right away since we have permission and user gesture
          try {
             if ("serviceWorker" in navigator && "PushManager" in window) {
                const register = await navigator.serviceWorker.ready;
                const subscription = await register.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
                });
                await apiClient.post("/notifications/subscribe", subscription);
             }
          } catch (e) {
             console.error("Failed to subscribe push in modal", e);
          }
        } else {
          toast.error("Izin notifikasi ditolak");
        }
      }

      // 2. Request GPS Permission
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              toast.success("Izin lokasi diberikan");
              resolve(pos);
            },
            (err) => {
              toast.error("Izin lokasi ditolak atau gagal didapatkan");
              resolve(err);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });
      }

      // Done
      localStorage.setItem("pwa_permission_asked", "true");
      setIsOpen(false);
    } catch (error) {
      console.error("Error requesting permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const skipPermissions = () => {
    localStorage.setItem("pwa_permission_asked", "true");
    setIsOpen(false);
    toast.info("Anda dapat mengaktifkan izin nanti melalui pengaturan browser.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) skipPermissions();
    }}>
      <DialogContent className="sm:max-w-[400px] bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 shadow-2xl z-[9999]">
        <DialogHeader className="flex flex-col items-center justify-center text-center pt-6">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 border-4 border-white dark:border-zinc-950 shadow-md relative">
            <ShieldAlert className="w-10 h-10 text-blue-600 dark:text-blue-500" />
            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-2 border-white dark:border-zinc-950">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -top-2 -left-2 bg-amber-500 rounded-full p-1.5 border-2 border-white dark:border-zinc-950">
              <MapPin className="w-4 h-4 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">
            Aktifkan Fitur Keamanan
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-zinc-400 mt-3 text-sm leading-relaxed max-w-[280px] mx-auto">
            SIGMA Bantul membutuhkan beberapa izin agar dapat melindungi Anda secara maksimal saat keadaan darurat.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 mt-2 space-y-4">
          <div className="flex gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2.5 rounded-full shrink-0 h-fit">
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">Lokasi GPS (Akurat)</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Untuk menemukan rute evakuasi terdekat ke shelter aman secara otomatis.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-amber-100 dark:bg-amber-900/40 p-2.5 rounded-full shrink-0 h-fit">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">Notifikasi Darurat</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Menerima peringatan gempa bumi secara real-time meskipun aplikasi tertutup.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 grid grid-cols-2 gap-3 sm:flex-col sm:space-x-0">
          <Button
            variant="outline"
            className="w-full text-slate-500 dark:text-slate-400"
            onClick={skipPermissions}
            disabled={loading}
          >
            Nanti Saja
          </Button>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            onClick={requestPermissions}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Izinkan Semua"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
