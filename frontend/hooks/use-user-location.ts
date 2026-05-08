import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface UseUserLocationReturn {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useUserLocation(
  autoRequest: boolean = true,
): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation tidak didukung oleh browser Anda";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);

    // iOS-friendly: Use shorter timeout and less aggressive options
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLoading(false);
        console.log("[useUserLocation] Location obtained:", {
          lat: latitude,
          lng: longitude,
        });
      },
      (err) => {
        let errorMessage = "Gagal mendapatkan lokasi Anda";

        // iOS sometimes returns empty error object, check if err.code exists
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

        setError(errorMessage);
        setLoading(false);
        console.warn(
          "[useUserLocation] Error:",
          err || "Unknown geolocation error",
        );

        // Don't show toast on error to avoid blocking UI on iOS
        // toast.error(errorMessage);
      },
      {
        enableHighAccuracy: false, // Changed to false for iOS compatibility
        timeout: 5000, // Reduced from 10000 to 5000ms
        maximumAge: 60000, // Allow cached location up to 1 minute
      },
    );
  };

  useEffect(() => {
    if (autoRequest) {
      // Delay auto-request slightly to let page render first (iOS fix)
      const timer = setTimeout(() => {
        requestLocation();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoRequest]);

  return { location, loading, error, requestLocation };
}
