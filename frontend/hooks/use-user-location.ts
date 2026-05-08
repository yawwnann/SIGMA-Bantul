"use client";

import { useCallback, useEffect, useState } from "react";

export type UserLocation = {
  lat: number;
  lng: number;
};

type LocationState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationState>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      setError("Browser tidak mendukung Geolocation API.");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus("granted");
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Akses lokasi ditolak.");
          return;
        }

        setStatus("error");
        setError(geoError.message || "Gagal mendapatkan lokasi pengguna.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    location,
    status,
    error,
    isLoading: status === "idle" || status === "requesting",
    requestLocation,
  };
}
