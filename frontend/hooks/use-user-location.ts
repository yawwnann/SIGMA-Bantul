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

        setError(errorMessage);
        setLoading(false);
        console.error("[useUserLocation] Error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest]);

  return { location, loading, error, requestLocation };
}
