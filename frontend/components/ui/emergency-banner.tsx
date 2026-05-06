"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { earthquakeApi } from "@/api";
import { Earthquake } from "@/types";

// Fungsi Haversine untuk jarak (km)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate impact radius based on magnitude
function calculateImpactRadius(magnitude: number): number {
  // Formula: R = Magnitude^2.5 * 1.5 km
  return Math.pow(magnitude, 2.5) * 1.5;
}

// Check if location is within Bantul administrative boundary
function isWithinBantul(lat: number, lng: number): boolean {
  // Bounding box yang lebih akurat untuk Kabupaten Bantul
  // Utara: berbatasan dengan Kota Yogyakarta (sekitar -7.80)
  // Selatan: Samudra Hindia (sekitar -8.15)
  // Barat: Kulon Progo (sekitar 110.15)
  // Timur: Gunung Kidul (sekitar 110.50)
  return lat >= -8.15 && lat <= -7.8 && lng >= 110.15 && lng <= 110.5;
}

function EmergencyBannerInner({
  userLat,
  userLon,
  onZoneCalculated,
}: {
  userLat: string;
  userLon: string;
  onZoneCalculated: (
    zone: "RED" | "YELLOW" | "GREEN" | null,
    eq: Earthquake | null,
  ) => void;
}) {
  const searchParams = useSearchParams();
  const isEmergency = searchParams?.get("emergency") === "true";
  const [latestEq, setLatestEq] = useState<Earthquake | null>(null);
  const [zone, setZone] = useState<"RED" | "YELLOW" | "GREEN" | null>(null);

  useEffect(() => {
    if (isEmergency) {
      earthquakeApi
        .getLatest()
        .then((eq) => {
          if (eq) setLatestEq(eq);
        })
        .catch(console.error);
    }
  }, [isEmergency]);

  useEffect(() => {
    if (latestEq && userLat && userLon) {
      const userLatNum = parseFloat(userLat);
      const userLonNum = parseFloat(userLon);
      const dist = calculateDistance(
        userLatNum,
        userLonNum,
        latestEq.lat,
        latestEq.lon,
      );

      // Check if earthquake is within Bantul boundary
      const eqInBantul = isWithinBantul(latestEq.lat, latestEq.lon);

      // Calculate impact radius based on magnitude
      const impactRadius = calculateImpactRadius(latestEq.magnitude);

      let newZone: "RED" | "YELLOW" | "GREEN" = "GREEN";

      // Hybrid approach: consider both administrative boundary and impact radius
      if (eqInBantul || dist <= impactRadius) {
        // RED: Earthquake in Bantul OR user within impact radius
        newZone = "RED";
      } else if (dist <= impactRadius * 3) {
        // YELLOW: User within extended warning zone (3x impact radius)
        newZone = "YELLOW";
      }
      // GREEN: User outside all danger zones

      setZone(newZone);
      onZoneCalculated(newZone, latestEq);
    }
  }, [latestEq, userLat, userLon, onZoneCalculated]);

  // Force invoke initial geolocation trigger if emergency
  useEffect(() => {
    if (isEmergency && !userLat && !userLon) {
      onZoneCalculated(null, null); // Just a signal to perhaps trigger geolocation auto in parent
    }
  }, [isEmergency, userLat, userLon, onZoneCalculated]);

  if (!isEmergency) return null;

  if (!latestEq) {
    return (
      <Alert className="mb-6 bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400">
        <AlertCircle className="h-4 w-4" color="currentColor" />
        <AlertTitle>Mode Darurat Aktif!</AlertTitle>
        <AlertDescription>
          Mendeteksi informasi gempa terkini...
        </AlertDescription>
      </Alert>
    );
  }

  if (zone === "RED") {
    return (
      <Alert className="mb-6 bg-red-600 border-red-800 text-white shadow-lg animate-pulse">
        <AlertTriangle className="h-5 w-5" color="white" />
        <AlertTitle className="font-bold text-lg">
          ZONA MERAH: BAHAYA TINGGI!
        </AlertTitle>
        <AlertDescription className="text-white/90">
          Anda berada di zona dampak utama gempa {latestEq.magnitude} SR.{" "}
          <strong>TETAP BERLINDUNG DI MENCEGAHAN!</strong> Rute evakuasi
          dinonaktifkan sementara karena risiko tinggi runtuhan dan
          infrastruktur yang rusak.
        </AlertDescription>
      </Alert>
    );
  }

  if (zone === "YELLOW") {
    return (
      <Alert className="mb-6 bg-yellow-50 border-yellow-400 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400">
        <AlertTriangle className="h-5 w-5" color="currentColor" />
        <AlertTitle className="font-bold">ZONA KUNING: WASPADA</AlertTitle>
        <AlertDescription>
          Anda berada di area waspada. Harap ikuti rute evakuasi yang tersedia
          menuju shelter aman terdekat dengan hati-hati.
        </AlertDescription>
      </Alert>
    );
  }

  if (zone === "GREEN") {
    return (
      <Alert className="mb-6 bg-green-50 border-green-400 text-green-800 dark:bg-green-950/50 dark:text-green-400">
        <Info className="h-5 w-5" color="currentColor" />
        <AlertTitle className="font-bold">ZONA HIJAU: AMAN</AlertTitle>
        <AlertDescription>
          Anda berada di luar jangkauan dampak utama gempa. Rute evakuasi
          beroperasi normal.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

export function EmergencyBanner(props: any) {
  return (
    <Suspense
      fallback={
        <div className="mb-6 h-20 bg-slate-100 dark:bg-zinc-800 animate-pulse rounded-lg" />
      }
    >
      <EmergencyBannerInner {...props} />
    </Suspense>
  );
}
