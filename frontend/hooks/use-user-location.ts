import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { watchPositionRobust } from "@/lib/geolocation-utils";

export interface UserLocation {
  lat: number;
  lng: number;
  heading?: number;
}

export interface UseUserLocationReturn {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  isManual: boolean;
  requestLocation: (manualOption?: boolean | any) => void;
  stopWatching: () => void;
}

export function useUserLocation(
  autoRequest: boolean = true,
): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManual, setIsManual] = useState(false);
  const watcherRef = useRef<{ clear: () => void } | null>(null);

  const stopWatching = () => {
    if (watcherRef.current !== null) {
      watcherRef.current.clear();
      watcherRef.current = null;
    }
  };

  const requestLocation = (manualOption?: boolean | any) => {
    const actualManual = manualOption !== false;
    setIsManual(actualManual);

    if (typeof window === "undefined" || !navigator.geolocation) {
      const errorMsg = "Geolocation tidak didukung oleh browser Anda";
      setError(errorMsg);
      if (actualManual) {
        toast.error(errorMsg);
      }
      return;
    }

    // Stop existing watcher
    stopWatching();

    setLoading(true);
    setError(null);

    // iOS-friendly: watchPosition for continuous heading updates
    watcherRef.current = watchPositionRobust(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        setLocation({
          lat: latitude,
          lng: longitude,
          heading: heading !== null && !isNaN(heading) ? heading : undefined,
        });
        setLoading(false);
      },
      (err) => {
        let errorMessage = "Gagal mendapatkan lokasi Anda";

        if (err && typeof err.code !== "undefined") {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage =
                "Izin lokasi ditolak. Aktifkan di pengaturan browser.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Lokasi tidak tersedia saat ini";
              break;
            case err.TIMEOUT:
              errorMessage = "Waktu permintaan lokasi habis";
              break;
          }
        }

        const errorCodeStr = err && typeof err.code !== "undefined" ? err.code : "unknown";
        errorMessage = `${errorMessage} (debug: hook_watchPosition_error_code_${errorCodeStr})`;

        setError(errorMessage);
        setLoading(false);
        console.warn(
          "[useUserLocation] Error:",
          err || "Unknown geolocation error",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  };

  useEffect(() => {
    if (autoRequest) {
      const timer = setTimeout(() => {
        requestLocation(false);
      }, 500);

      return () => {
        clearTimeout(timer);
        stopWatching();
      };
    }

    return () => {
      stopWatching();
    };
  }, [autoRequest]);

  return { location, loading, error, isManual, requestLocation, stopWatching };
}

