"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EnableNotificationsButton() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!("Notification" in window)) {
      setIsSupported(false);
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser tidak mendukung notifikasi");
      return;
    }

    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast.success("Notifikasi diaktifkan! Refresh halaman untuk menghubungkan ke server.", {
          icon: "🔔",
          duration: 5000,
        });
        
        // Reload to trigger PushNotificationManager
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (result === "denied") {
        toast.error("Izin notifikasi ditolak. Silakan ubah di pengaturan browser.", {
          icon: "⚠️",
          duration: 5000,
        });
      } else {
        toast.info("Izin notifikasi belum diberikan", {
          icon: "ℹ️",
        });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Gagal meminta izin notifikasi");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  if (permission === "granted") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
        disabled
      >
        <Bell className="w-4 h-4 mr-2" />
        Notifikasi Aktif
      </Button>
    );
  }

  if (permission === "denied") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-200 bg-red-50"
        onClick={() => {
          toast.info("Buka Settings > Privacy > Notifications untuk mengaktifkan");
        }}
      >
        <BellOff className="w-4 h-4 mr-2" />
        Notifikasi Diblokir
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnableNotifications}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Bell className="w-4 h-4 mr-2" />
      )}
      Aktifkan Notifikasi
    </Button>
  );
}
