"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  earthquakeApi,
  hazardZoneApi,
  publicFacilityApi,
  roadApi,
} from "@/api";
import { analysisApi } from "@/api/analysis";
import { setBantulPolygon, isWithinBantul } from "@/lib/bantul-boundary";
import { socketService } from "@/lib/socket";
import type { Earthquake, Shelter, HazardZone, PublicFacility } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  X,
  Layers,
  Info,
  Footprints,
  Bike,
  Car,
  Clock,
  Activity,
} from "lucide-react";
import { useTheme } from "next-themes";
// Import hook dan service baru untuk nearby shelters
import { useUserLocation } from "@/hooks/use-user-location";
import { evacuationService } from "@/services/evacuation.service";

const MapClient = dynamic(
  () => import("@/components/map/map-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    ),
  },
);

// --- Constants ---
// Bantul center coordinates (approximate)
const BANTUL_LAT = -7.8878;
const BANTUL_LON = 110.3289;


// --- Helpers ---

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate impact radius based on magnitude
function calculateImpactRadius(magnitude: number): number {
  return Math.pow(magnitude, 2.5) * 1.5;
}

// Check if location is threatened by earthquake
function isThreatened(
  userLat: number,
  userLng: number,
  eqLat: number,
  eqLon: number,
  magnitude: number,
): boolean {
  const distance = calculateDistance(userLat, userLng, eqLat, eqLon);
  const impactRadius = calculateImpactRadius(magnitude);

  // Threatened if within impact radius
  return distance <= impactRadius;
}

// --- Main Component ---
export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  // Auto-request user location (NEW) - iOS-optimized with delay and shorter timeout
  const { location: userLocation } =
    useUserLocation(true);

  // Data State
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roadNetwork, setRoadNetwork] = useState<any>(null);
  const [expandedShelterId, setExpandedShelterId] = useState<number | null>(
    null,
  );

  // App State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map Interactive State
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [calculatedRoute, setCalculatedRoute] = useState<any>(null);
  const [, setNearestShelters] = useState<
    (Shelter & { distance: number })[]
  >([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedEarthquake, setSelectedEarthquake] =
    useState<Earthquake | null>(null);
  const [routingMode, setRoutingMode] = useState(false);
  const [routeStart, setRouteStart] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routeEnd, setRouteEnd] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destinationName, setDestinationName] = useState<string>("Tujuan");
  const [activeRouteMode, setActiveRouteMode] = useState<
    "walk" | "bike" | "car"
  >("car");
  const [nearbyRadius, setNearbyRadius] = useState(3);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [, setIsShelterDetailOpen] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClear = () => setSelectedEarthquake(null);
    window.addEventListener("clearEarthquakeSelection", handleClear);
    return () =>
      window.removeEventListener("clearEarthquakeSelection", handleClear);
  }, []);

  // Refs untuk menghindari stale closure di socket callback
  const sheltersRef = useRef(shelters);
  useEffect(() => {
    sheltersRef.current = shelters;
  }, [shelters]);
  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  const emergencyHandlerRef = useRef<() => void>(() => {});

  const handleEmergencyEvacuation = useCallback(() => {
    const currentShelters = sheltersRef.current;

    if (currentShelters.length === 0) {
      toast.info("Mencari rute evakuasi darurat...", {
        description: "Data shelter belum tersedia, mohon tunggu sebentar",
        duration: 5000,
      });
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        if (!isWithinBantul(userLat, userLng)) {
          toast.error(
            "Lokasi Anda di luar wilayah Kabupaten Bantul. Sistem hanya mendukung evakuasi di wilayah Bantul.",
          );
          setGettingLocation(false);
          return;
        }

        let availableShelters = currentShelters.filter(
          (s) => s.capacity - (s.currentOccupancy ?? 0) > 0,
        );
        if (availableShelters.length === 0) {
          availableShelters = [...currentShelters];
        }

        let nearestShelter = availableShelters[0];
        let minDistance = Infinity;
        availableShelters.forEach((s) => {
          const coords = s.geometry as { coordinates: [number, number] };
          const dist = calculateDistance(
            userLat,
            userLng,
            coords.coordinates[1],
            coords.coordinates[0],
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestShelter = s;
          }
        });

        const targetCoords = nearestShelter.geometry as {
          coordinates: [number, number];
        };

        setSelectedLocation({ lat: userLat, lng: userLng });
        setRoutingMode(true);

        try {
          toast.info(`Menghitung rute ke ${nearestShelter.name}...`);
          const route = await roadApi.calculateRoute(
            userLat,
            userLng,
            targetCoords.coordinates[1],
            targetCoords.coordinates[0],
          );

          setCalculatedRoute(route);
          setRouteStart({ lat: userLat, lng: userLng });
          setRouteEnd({
            lat: targetCoords.coordinates[1],
            lng: targetCoords.coordinates[0],
          });
          setDestinationName(nearestShelter.name);
          setIsMapExpanded(true);
          toast.success(
            `Rute darurat ke ${nearestShelter.name} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error(
            "[Emergency] Error calculating emergency route:",
            error,
          );
          toast.error("Gagal menghitung rute darurat dari lokasi saat ini.", {
            description: "Silakan coba lagi atau pilih shelter secara manual",
            duration: 5000,
          });
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error("[Emergency] Geolocation error:", error);
        let errorMessage = "Gagal mendapatkan lokasi GPS Anda untuk evakuasi.";
        let errorDescription = "";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Izin lokasi ditolak";
            errorDescription =
              "Silakan aktifkan izin lokasi di pengaturan browser untuk menggunakan fitur rute darurat";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Lokasi tidak tersedia";
            errorDescription =
              "GPS tidak dapat menentukan lokasi Anda saat ini";
            break;
          case error.TIMEOUT:
            errorMessage = "Waktu habis";
            errorDescription =
              "Permintaan lokasi memakan waktu terlalu lama. Silakan coba lagi";
            break;
        }

        toast.error(errorMessage, {
          description: errorDescription,
          duration: 7000,
        });
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }, []);

  useEffect(() => {
    emergencyHandlerRef.current = handleEmergencyEvacuation;
  }, [handleEmergencyEvacuation]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Calculate 1 day ago for earthquake filter
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const startDate = oneDayAgo.toISOString().split("T")[0];

      const [hazardData, earthquakesResponse, facilitiesData, roadNetworkData] =
        await Promise.all([
          hazardZoneApi.getAll().catch(() => []),
          earthquakeApi
            .getAll({
              limit: 100,
              startDate: startDate, // Only get earthquakes from last 24 hours
            })
            .catch(() => ({ data: [], total: 0, page: 1, limit: 100 })),
          publicFacilityApi.getAll().catch(() => []),
          roadApi
            .getRoadNetwork({
              minLat: -8.05,
              maxLat: -7.75,
              minLon: 110.15,
              maxLon: 110.55,
            })
            .catch(() => null),
        ]);

      // Fetch boundary untuk validasi isWithinBantul
      try {
        const boundary = await analysisApi.getBantulBoundary();
        const coords = boundary.features?.[0]?.geometry?.coordinates ?? null;
        setBantulPolygon(coords);
      } catch {
        // gagal fetch boundary, fallback bounding box tetap jalan
      }
      // Don't fetch all shelters here - will fetch nearby shelters based on user location
      setHazardZones(hazardData as HazardZone[]);
      setEarthquakes(earthquakesResponse.data);
      setFacilities(facilitiesData as PublicFacility[]);
      setRoadNetwork(roadNetworkData);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data dari server.");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch nearby shelters when user location is available
  useEffect(() => {
    if (!userLocation) return;

    const fetchNearbyShelters = async () => {
      try {
        console.log(
          "[Dashboard] Fetching nearby shelters for location:",
          userLocation,
        );
        const nearbyShelters = await evacuationService.getNearbyShelters({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: nearbyRadius,
          limit: 10, // max 10 shelters
        });

        console.log(
          "[Dashboard] Found nearby shelters:",
          nearbyShelters.length,
        );
        setShelters(nearbyShelters as Shelter[]);

        if (nearbyShelters.length > 0) {
          toast.success(
            `Ditemukan ${nearbyShelters.length} lokasi evakuasi terdekat`,
          );
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching nearby shelters:", error);
        toast.error("Gagal memuat lokasi evakuasi terdekat");
        setShelters([]); // Set empty if error
      }
    };

    fetchNearbyShelters();
  }, [userLocation, nearbyRadius]);

  // NEW: Auto set selected location and fly to user location when available
  useEffect(() => {
    if (!userLocation) return;

    console.log(
      "[Dashboard] Setting user location and flying to:",
      userLocation,
    );

    // Set selected location
    setSelectedLocation({
      lat: userLocation.lat,
      lng: userLocation.lng,
    });

    // Fly to user location
    setFlyToLocation({
      lat: userLocation.lat,
      lon: userLocation.lng,
      zoom: 15, // Zoom level untuk melihat detail area
    });

    toast.success("Lokasi Anda ditemukan", {
      description: `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`,
    });
  }, [userLocation]);

  useEffect(() => {
    fetchData();

    socketService.connect();

    const unsubscribeEarthquake = socketService.onNewEarthquake((newEq) => {
      const eqInBantul = isWithinBantul(newEq.lat, newEq.lon);
      const impactRadius = calculateImpactRadius(newEq.magnitude);

      const loc = userLocationRef.current;

      let zone: "RED" | "YELLOW" | "GREEN" = "GREEN";
      let distToUser = Infinity;

      if (loc) {
        distToUser = calculateDistance(loc.lat, loc.lng, newEq.lat, newEq.lon);

        if (eqInBantul || distToUser <= impactRadius) {
          zone = "RED";
        } else if (distToUser <= impactRadius * 3) {
          zone = "YELLOW";
        }
      } else {
        if (eqInBantul) {
          zone = "RED";
        }
      }

      const eqFromBantul = calculateDistance(
        newEq.lat,
        newEq.lon,
        BANTUL_LAT,
        BANTUL_LON,
      );

      const handleClickToast = () => {
        setFlyToLocation({ lat: newEq.lat, lon: newEq.lon, zoom: 11 });
        setSelectedEarthquake(newEq);
      };

      const zoneLabel =
        zone === "RED"
          ? "ZONA MERAH"
          : zone === "YELLOW"
            ? "ZONA KUNING"
            : "ZONA HIJAU";

      const zoneAction =
        zone === "RED"
          ? "Tetap berlindung di tempat aman!"
          : zone === "YELLOW"
            ? "Segera evakuasi ke shelter terdekat!"
            : "Pantau informasi gempa lebih lanjut.";

      const borderColor =
        zone === "RED"
          ? "border-l-red-600"
          : zone === "YELLOW"
            ? "border-l-yellow-500"
            : "border-l-green-500";

      toast(
        <div
          onClick={handleClickToast}
          className={`cursor-pointer border-l-4 ${borderColor} pl-3 py-1`}
        >
          <div className="font-semibold text-sm">
            {zone === "RED" ? "🔴" : zone === "YELLOW" ? "🟡" : "🟢"} Gempa M
            {newEq.magnitude} di {newEq.location}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Kedalaman: {newEq.depth} km &middot; {eqFromBantul.toFixed(1)} km
            dari Bantul
          </div>
          <div className="text-xs mt-1 font-medium">
            Kamu berada di {zoneLabel}. {zoneAction}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Klik untuk melihat detail
          </div>
        </div>,
        { duration: 15000 },
      );

      setEarthquakes((prev) => [newEq, ...prev.slice(0, 99)]);
    });

    return () => {
      unsubscribeEarthquake();
      socketService.disconnect();
    };
  }, []);

  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      if (!isWithinBantul(lat, lng)) {
        return;
      }
      setSelectedLocation({ lat, lng });
      if (shelters.length > 0) {
        const withDistance = shelters.map((shelter) => {
          const coords = shelter.geometry as { coordinates: [number, number] };
          const distance = calculateDistance(
            lat,
            lng,
            coords.coordinates[1],
            coords.coordinates[0],
          );
          return { ...shelter, distance };
        });
        withDistance.sort((a, b) => a.distance - b.distance);
        setNearestShelters(withDistance.slice(0, 3));
      }
    },
    [shelters],
  );

  // Handle emergency routing from push notification click or toast
  useEffect(() => {
    if (shelters.length === 0) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("emergency") === "true") {
      console.log("[Emergency] Emergency mode activated from URL parameter");

      // Remove param from URL to prevent re-triggering on refresh
      window.history.replaceState({}, document.title, window.location.pathname);

      toast.info("Mencari rute evakuasi darurat...", {
        description:
          "Mohon izinkan akses lokasi untuk menghitung rute terdekat",
        duration: 5000,
      });

      if (!navigator.geolocation) {
        console.error("[Emergency] Geolocation not supported");
        toast.error("Geolocation tidak didukung oleh browser ini.");
        return;
      }

      setGettingLocation(true);

      console.log("[Emergency] Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log("[Emergency] Geolocation obtained:", position.coords);
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          if (!isWithinBantul(userLat, userLng)) {
            console.warn("[Emergency] User location outside Bantul");
            toast.error(
              "Lokasi Anda di luar wilayah Kabupaten Bantul. Sistem hanya mendukung evakuasi di wilayah Bantul.",
            );
            setGettingLocation(false);
            return;
          }

          // 1. Find shelters with available capacity
          let availableShelters = shelters.filter(
            (s) => s.capacity - (s.currentOccupancy ?? 0) > 0,
          );
          console.log(
            "[Emergency] Available shelters:",
            availableShelters.length,
          );

          if (availableShelters.length === 0) {
            toast.error(
              "Peringatan: Tidak ada shelter dengan kapasitas tersedia. Mencari shelter terdekat...",
            );
            // Fallback to all shelters if none available
            availableShelters = [...shelters];
          }

          // 2. Locate nearest available shelter
          let nearestShelter = availableShelters[0];
          let minDistance = Infinity;

          availableShelters.forEach((s) => {
            const coords = s.geometry as { coordinates: [number, number] };
            const dist = calculateDistance(
              userLat,
              userLng,
              coords.coordinates[1],
              coords.coordinates[0],
            );
            if (dist < minDistance) {
              minDistance = dist;
              nearestShelter = s;
            }
          });

          const targetCoords = nearestShelter.geometry as {
            coordinates: [number, number];
          };

          // Set state for location select first
          setSelectedLocation({ lat: userLat, lng: userLng });
          setRoutingMode(true);

          // 3. Immediately calculate map route
          try {
            toast.info(`Menghitung rute ke ${nearestShelter.name}...`);
            const route = await roadApi.calculateRoute(
              userLat,
              userLng,
              targetCoords.coordinates[1],
              targetCoords.coordinates[0],
            );

            setCalculatedRoute(route);
            setRouteStart({ lat: userLat, lng: userLng });
            setRouteEnd({
              lat: targetCoords.coordinates[1],
              lng: targetCoords.coordinates[0],
            });
            setDestinationName(nearestShelter.name);
            setIsMapExpanded(true);

            const threateningEq = earthquakes.find((eq) =>
              isThreatened(userLat, userLng, eq.lat, eq.lon, eq.magnitude),
            );
            if (threateningEq) setSelectedEarthquake(threateningEq);

            setRoutingMode(false);

            toast.success(
              `Rute darurat ke ${nearestShelter.name} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
            );
          } catch (error) {
            console.error(
              "[Emergency] Error calculating emergency route:",
              error,
            );
            toast.error("Gagal menghitung rute darurat dari lokasi saat ini.", {
              description: "Silakan coba lagi atau pilih shelter secara manual",
              duration: 5000,
            });
          } finally {
            setGettingLocation(false);
          }
        },
        (error) => {
          console.error("[Emergency] Geolocation error:", error);

          let errorMessage =
            "Gagal mendapatkan lokasi GPS Anda untuk evakuasi.";
          let errorDescription = "";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Izin lokasi ditolak";
              errorDescription =
                "Silakan aktifkan izin lokasi di pengaturan browser untuk menggunakan fitur rute darurat";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Lokasi tidak tersedia";
              errorDescription =
                "GPS tidak dapat menentukan lokasi Anda saat ini";
              break;
            case error.TIMEOUT:
              errorMessage = "Waktu habis";
              errorDescription =
                "Permintaan lokasi memakan waktu terlalu lama. Silakan coba lagi";
              break;
          }

          toast.error(errorMessage, {
            description: errorDescription,
            duration: 7000,
          });
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    }
  }, [shelters.length]);

  const handleMapClick = (lat: number, lng: number) => {
    if (!isWithinBantul(lat, lng)) {
      toast.error(
        "Maaf, wilayah yang Anda pilih di luar batas wilayah Kabupaten Bantul.",
      );
      return;
    }

    if (!routingMode) {
      handleLocationSelect(lat, lng);
      return;
    }

    if (!routeStart && !routeEnd) {
      setRouteStart({ lat, lng });
      setSelectedLocation({ lat, lng });
      toast.success("Titik awal dipilih. Klik lagi untuk titik tujuan.");
    } else if (routeStart && !routeEnd) {
      setRouteEnd({ lat, lng });
      toast.success("Titik tujuan dipilih. Menghitung rute...");

      setCalculatingRoute(true);
      setTimeout(async () => {
        try {
          const route = await roadApi.calculateRoute(
            routeStart.lat,
            routeStart.lng,
            lat,
            lng,
          );
          setCalculatedRoute(route);
          setDestinationName(`Titik (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          setIsMapExpanded(true);
          toast.success(
            `Rute ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error("Error calculating route:", error);
          toast.error("Gagal menghitung rute. Coba titik lain.");
          setRouteEnd(null);
        } finally {
          setCalculatingRoute(false);
        }
      }, 100);
    } else if (!routeStart && routeEnd) {
      setRouteStart({ lat, lng });
      setSelectedLocation({ lat, lng });
      toast.success("Titik awal dipilih. Menghitung rute evakuasi...");

      setCalculatingRoute(true);
      setTimeout(async () => {
        try {
          const route = await roadApi.calculateRoute(
            lat,
            lng,
            routeEnd.lat,
            routeEnd.lng,
          );
          setCalculatedRoute(route);
          setDestinationName(
            `Titik (${routeEnd.lat.toFixed(4)}, ${routeEnd.lng.toFixed(4)})`,
          );
          setIsMapExpanded(true);
          toast.success(
            `Rute ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error("Error calculating route:", error);
          toast.error("Gagal menghitung rute. Coba titik lain.");
          setRouteStart(null);
        } finally {
          setCalculatingRoute(false);
        }
      }, 100);
    } else {
      setRouteStart({ lat, lng });
      setSelectedLocation({ lat, lng });
      setRouteEnd(null);
      setCalculatedRoute(null);
      toast.info("Titik awal baru dipilih. Klik lagi untuk titik tujuan.");
    }
  };

  const calculateRouteToShelter = async (
    shelterLat: number,
    shelterLng: number,
    shelterName: string,
  ) => {
    // Jika routing mode ON tanpa routeStart, set tujuan dulu
    if (routingMode && !routeStart) {
      setRouteEnd({ lat: shelterLat, lng: shelterLng });
      toast.info(
        `Tujuan di set ke ${shelterName}. Klik pada peta untuk memilih titik awal evakuasi Anda.`,
      );
      return;
    }

    // Dapatkan GPS posisi user (fresh setiap kali)
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser ini");
      return;
    }

    setCalculatingRoute(true);
    toast.info("Mendapatkan lokasi Anda...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        if (!isWithinBantul(userLat, userLng)) {
          toast.error(
            "Lokasi Anda di luar wilayah Kabupaten Bantul. Sistem hanya mendukung evakuasi di wilayah Bantul.",
          );
          setCalculatingRoute(false);
          return;
        }

        // Tentukan start point
        const startLat = routingMode && routeStart ? routeStart.lat : userLat;
        const startLng = routingMode && routeStart ? routeStart.lng : userLng;

        try {
          toast.info("Menghitung rute terpendek...");
          const route = await roadApi.calculateRoute(
            startLat,
            startLng,
            shelterLat,
            shelterLng,
          );

          setCalculatedRoute(route);
          setRouteStart({ lat: startLat, lng: startLng });
          setRouteEnd({ lat: shelterLat, lng: shelterLng });
          setDestinationName(shelterName);
          setIsMapExpanded(true);

          const threateningEq = earthquakes.find((eq) =>
            isThreatened(startLat, startLng, eq.lat, eq.lon, eq.magnitude),
          );
          if (threateningEq) setSelectedEarthquake(threateningEq);

          toast.success(
            `Rute ke ${shelterName} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error("Error calculating route:", error);
          toast.error(
            "Gagal menghitung rute. Pastikan lokasi terhubung dengan jalan.",
          );
        } finally {
          setCalculatingRoute(false);
        }
      },
      (error) => {
        toast.error("Gagal mendapatkan lokasi Anda.");
        setCalculatingRoute(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleEarthquakeClick = (earthquake: Earthquake) => {
    setSelectedEarthquake(earthquake);
  };

  const handleCloseEarthquakeDetail = () => {
    setSelectedEarthquake(null);
    window.dispatchEvent(new CustomEvent("hideEarthquakeRadius"));
  };

  const isDark = mounted && theme === "dark";

  return (
    <>
      {/* Global Loading Overlay for Routing */}
      {gettingLocation && (
        <div className="fixed inset-0 z-[9999] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 rounded-2xl flex flex-col items-center shadow-2xl max-w-sm text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
              Mencari Rute Evakuasi...
            </h2>
            <p className="text-slate-600 dark:text-zinc-400 text-sm">
              Sedang melacak lokasi Anda dan menghitung rute teraman menuju
              shelter terdekat. Mohon tunggu sebentar.
            </p>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8 min-h-screen space-y-6 max-w-[1600px] mx-auto">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              SIGMA Bantul
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 shadow-sm">
            <span>
              {currentTime
                ? currentTime.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </span>
            {currentTime && (
              <>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
                <div className="hidden sm:flex items-center gap-2 font-mono">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    {currentTime.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Overlay Backdrop when Map is Expanded */}
        {isMapExpanded && (
          <div
            className="fixed inset-0 z-[90] bg-slate-900/40 dark:bg-zinc-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMapExpanded(false)}
          />
        )}

        {/* Main Map Fullscreen/Expanded Container */}
        <div
          className={
            isMapExpanded
              ? "fixed inset-4 md:inset-6 lg:inset-8 z-[100] rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-zinc-700 shadow-2xl bg-slate-100 dark:bg-zinc-900 transition-all duration-300"
              : "relative w-full h-[55vh] min-h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm bg-slate-100 dark:bg-zinc-900 transition-all duration-300 flex flex-col"
          }
        >
          {/* Loading Indicator Overlay */}
          {calculatingRoute && (
            <div className="absolute inset-0 z-[2000] bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl transition-all duration-300">
              <div className="bg-white/95 dark:bg-slate-900/95 px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-500" />
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Menghitung Rute
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Mencari jalur tercepat dan teraman...
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="absolute top-4 right-4 z-[1000] flex flex-row gap-2">
            {/* Info Panel Toggle */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
              <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors h-10 w-10">
                <Info className="h-5 w-5 text-slate-700 dark:text-zinc-300" />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[380px] p-0 bg-slate-50 dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 z-[1001]"
              >
                <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 p-5 flex items-center justify-between">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <Info className="h-5 w-5" /> Info Lokasi
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSheetOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="overflow-y-auto h-[calc(100vh-5rem)] p-5 space-y-4">
                  {/* Location Picker Module */}
                  {selectedLocation && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-800 pb-2">
                        Lokasi Terpilih
                      </h2>
                      <Card className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm">
                        <CardContent className="pt-4 pb-4">
                          <div className="font-mono text-xs font-semibold bg-slate-100 dark:bg-zinc-950 p-2 rounded">
                            {selectedLocation.lat.toFixed(6)},{" "}
                            {selectedLocation.lng.toFixed(6)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  {/* Nearest Shelter Module */}
                  {shelters.length > 0 && selectedLocation && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                        <span>5 Shelter Terdekat</span>
                        <Badge variant="outline" className="text-xs">
                          {shelters.length} total
                        </Badge>
                      </h2>
                      <div className="space-y-2">
                        {shelters.slice(0, 5).map((shelter, i) => {
                          const coords = shelter.geometry as {
                            coordinates: [number, number];
                          };
                          const distance = selectedLocation
                            ? calculateDistance(
                                selectedLocation.lat,
                                selectedLocation.lng,
                                coords.coordinates[1],
                                coords.coordinates[0],
                              )
                            : 0;

                          return (
                            <Card
                              key={shelter.id}
                              className={`bg-white dark:bg-zinc-900 shadow-sm cursor-pointer transition-colors ${expandedShelterId === shelter.id ? "border-primary ring-1 ring-primary" : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"}`}
                              onClick={() =>
                                setExpandedShelterId(
                                  expandedShelterId === shelter.id
                                    ? null
                                    : shelter.id,
                                )
                              }
                            >
                              <CardContent className="pt-4 pb-4 flex flex-col gap-2 text-sm">
                                <div className="flex justify-between items-start">
                                  <div className="pr-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                        #{i + 1}
                                      </span>
                                      <p className="font-semibold text-slate-800 dark:text-zinc-200">
                                        {shelter.name}
                                      </p>
                                    </div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                      {distance.toFixed(2)} km
                                    </p>
                                  </div>
                                </div>

                                {expandedShelterId === shelter.id && (
                                  <div className="mt-2 pt-3 border-t border-slate-100 dark:border-zinc-800/60 animate-in fade-in slide-in-from-top-2 flex flex-col gap-2.5">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                          Kondisi
                                        </p>
                                        <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                          {shelter.condition}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                          Kapasitas
                                        </p>
                                        <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                          {shelter.capacity} Orang
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                        Alamat
                                      </p>
                                      <p
                                        className="text-xs font-medium text-slate-700 dark:text-zinc-300 line-clamp-2"
                                        title={shelter.address || ""}
                                      >
                                        {shelter.address || "-"}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const coords = shelter.geometry as {
                                          coordinates: [number, number];
                                        };
                                        calculateRouteToShelter(
                                          coords.coordinates[1],
                                          coords.coordinates[0],
                                          shelter.name,
                                        );
                                      }}
                                    >
                                      <Navigation className="w-3 h-3 mr-2" />
                                      Dapatkan Rute
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Hazard Zones */}
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-800 pb-2">
                      Zona Rawan
                    </h2>
                    <Card className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm">
                      <CardContent className="pt-4 pb-4 space-y-2">
                        {hazardZones.slice(0, 4).map((zone) => (
                          <div
                            key={zone.id}
                            className="flex justify-between items-center text-sm"
                          >
                            <span className="text-slate-700 dark:text-zinc-300 truncate">
                              {zone.name}
                            </span>
                            <Badge
                              variant={
                                zone.level === "CRITICAL"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {zone.level}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Expand Map Toggle */}
            <Button
              onClick={() => {
                setIsMapExpanded(!isMapExpanded);
                setTimeout(
                  () => window.dispatchEvent(new Event("resize")),
                  350,
                );
              }}
              variant="outline"
              size="icon"
              className="h-10 w-10 shadow-lg bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 group"
              title={isMapExpanded ? "Perkecil Peta" : "Perbesar Peta"}
            >
              {isMapExpanded ? (
                <Minimize2 className="w-5 h-5 text-slate-700 dark:text-zinc-300 group-hover:scale-95 transition-transform" />
              ) : (
                <Maximize2 className="w-5 h-5 text-slate-700 dark:text-zinc-300 group-hover:scale-105 transition-transform" />
              )}
            </Button>
          </div>

          {/* Selected Earthquake Floating Detail - Compact Bottom */}
          {selectedEarthquake && (
            <div
              className="absolute bottom-6 left-4 right-4 md:left-auto md:right-4 md:bottom-8 z-[80] md:z-[500] md:w-[280px] shadow-2xl rounded-xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300"
              style={{
                background: isDark
                  ? "rgba(3, 7, 18, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(12px)",
                color: isDark ? "#f1f5f9" : "#0f172a",
                fontFamily: "system-ui,sans-serif",
                border: isDark
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "1px solid rgba(226, 232, 240, 0.8)",
              }}
            >
              {/* Compact Header */}
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: isDark
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "1px solid rgba(226, 232, 240, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      background: isDark ? "#7f1d1d" : "#fef2f2",
                      color: isDark ? "#f87171" : "#dc2626",
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    GEMPA
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: isDark ? "#f1f5f9" : "#0f172a",
                    }}
                  >
                    {selectedEarthquake.location}
                  </span>
                </div>
                <button
                  onClick={handleCloseEarthquakeDetail}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: isDark ? "#6b7280" : "#64748b",
                    cursor: "pointer",
                    padding: "2px",
                    lineHeight: 1,
                    borderRadius: "4px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark
                      ? "#1f2937"
                      : "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Compact Body */}
              <div
                style={{
                  padding: "8px 10px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                {/* Magnitude - Compact */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 12px",
                    background: isDark
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(239, 68, 68, 0.08)",
                    borderRadius: "8px",
                    border: isDark
                      ? "1px solid rgba(239, 68, 68, 0.3)"
                      : "1px solid rgba(239, 68, 68, 0.15)",
                    minWidth: "70px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "8px",
                      color: isDark ? "#9ca3af" : "#64748b",
                      fontWeight: 600,
                      marginBottom: "2px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    MAG
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 800,
                      color: isDark ? "#f87171" : "#dc2626",
                      lineHeight: 1,
                    }}
                  >
                    {selectedEarthquake.magnitude}
                  </div>
                </div>

                {/* Details - Compact Grid */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "11px",
                    }}
                  >
                    <span
                      style={{
                        color: isDark ? "#9ca3af" : "#64748b",
                        fontWeight: 500,
                      }}
                    >
                      Kedalaman
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: isDark ? "#f1f5f9" : "#0f172a",
                      }}
                    >
                      {selectedEarthquake.depth} Km
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "10px",
                    }}
                  >
                    <span
                      style={{
                        color: isDark ? "#9ca3af" : "#64748b",
                        fontWeight: 500,
                      }}
                    >
                      Koordinat
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: isDark ? "#d1d5db" : "#475569",
                        fontFamily: "monospace",
                      }}
                    >
                      {selectedEarthquake.lat.toFixed(2)},{" "}
                      {selectedEarthquake.lon.toFixed(2)}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "9px",
                      color: isDark ? "#6b7280" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      marginTop: "2px",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {new Date(selectedEarthquake.time).toLocaleDateString(
                      "id-ID",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Routing Info Form/Floating Detail - Mobile View */}
          {calculatedRoute && (
            <>
              {/* Route Info Top Bar */}
              <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-[1000] bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-top-5 duration-300">
                <div className="p-3 border-b border-slate-100 dark:border-zinc-800 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 mt-2">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white dark:bg-zinc-950 z-10" />
                      <div className="w-0.5 h-3 bg-slate-300 dark:bg-zinc-700" />
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-8 bg-slate-50 dark:bg-zinc-900 rounded-lg px-3 flex items-center text-[13px] text-slate-600 dark:text-zinc-400 border border-slate-100 dark:border-zinc-800 truncate">
                        Lokasi Anda
                      </div>
                      <div className="h-8 bg-slate-50 dark:bg-zinc-900 rounded-lg px-3 flex items-center text-[13px] font-semibold text-slate-900 dark:text-zinc-100 border border-slate-100 dark:border-zinc-800 truncate">
                        {destinationName}
                      </div>
                    </div>
                    <button
                      className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-full mt-1"
                      onClick={() => {
                        setCalculatedRoute(null);
                        setRouteStart(null);
                        setRouteEnd(null);
                      }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Mode Selectors */}
                <div className="flex justify-around items-center p-1.5 bg-slate-50/50 dark:bg-zinc-900/20">
                  {(() => {
                    const distKm =
                      calculatedRoute.properties.totalDistance / 1000;
                    const walkTime = Math.ceil((distKm / 5) * 60);
                    const bikeTime = Math.ceil((distKm / 40) * 60);
                    const carTime = Math.ceil((distKm / 30) * 60);

                    return (
                      <>
                        <button
                          onClick={() => setActiveRouteMode("car")}
                          className={`flex flex-col items-center p-2 rounded-xl min-w-[70px] transition-colors ${activeRouteMode === "car" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}
                        >
                          <Car className="w-4 h-4 mb-1" />
                          <span className="text-[10px] font-bold">
                            {carTime} mnt
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveRouteMode("bike")}
                          className={`flex flex-col items-center p-2 rounded-xl min-w-[70px] transition-colors ${activeRouteMode === "bike" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}
                        >
                          <Bike className="w-4 h-4 mb-1" />
                          <span className="text-[10px] font-bold">
                            {bikeTime} mnt
                          </span>
                        </button>
                        <button
                          onClick={() => setActiveRouteMode("walk")}
                          className={`flex flex-col items-center p-2 rounded-xl min-w-[70px] transition-colors ${activeRouteMode === "walk" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}
                        >
                          <Footprints className="w-4 h-4 mb-1" />
                          <span className="text-[10px] font-bold">
                            {walkTime} mnt
                          </span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
          {/* End Routing Info Form/Floating Detail */}

          {/* Selected Location Floating Detail - REMOVED */}

          <div className="relative h-full w-full dark-map-container flex-1">
            {loading && (
              <div className="absolute inset-0 z-[2000] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-700 dark:text-zinc-300 font-medium">
                  Memuat data peta...
                </p>
                <p className="text-slate-500 dark:text-zinc-500 text-sm mt-2">
                  Mengambil data shelter, gempa, dan zona rawan
                </p>
              </div>
            )}
            <MapClient
              earthquakes={earthquakes}
              shelters={shelters}
              hazardZones={hazardZones}
              facilities={facilities}
              userLocation={userLocation}
              selectedLocation={selectedLocation}
              onLocationSelect={handleMapClick}
              onEarthquakeClick={handleEarthquakeClick}
              onCalculateRoute={calculateRouteToShelter}
              roadNetwork={roadNetwork}
              calculatedRoute={calculatedRoute}
              routeStart={routeStart}
              routeEnd={routeEnd}
              selectedEarthquake={selectedEarthquake}
              flyToLocation={flyToLocation}
              onShelterDetailOpen={setIsShelterDetailOpen}
            />
          </div>
        </div>

        {/* DASHBOARD WIDGETS BELOW (Visible by scrolling down) */}
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 pt-4">
          Dashboard Analitik
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {/* Widget 1: Shelter Statistics */}
          <Card className="border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Shelter Tersedia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {shelters.length}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-zinc-400">
                    lokasi
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-zinc-400">
                      Total Kapasitas
                    </span>
                    <span className="font-bold text-slate-900 dark:text-zinc-100">
                      {shelters
                        .reduce((sum, s) => sum + (s.capacity || 0), 0)
                        .toLocaleString()}{" "}
                      orang
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2">
                    <span className="text-slate-600 dark:text-zinc-400">
                      Radius Terdekat
                    </span>
                    <select
                      value={nearbyRadius}
                      onChange={(e) => setNearbyRadius(Number(e.target.value))}
                      className="font-bold text-green-600 dark:text-green-400 bg-transparent border border-green-300 dark:border-green-700 rounded px-1 py-0.5 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value={1}>1 km</option>
                      <option value={3}>3 km</option>
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget 2: Earthquake 24h Statistics */}
          <Card className="border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-600" />
                Gempa 24 Jam Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                    {earthquakes.length}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-zinc-400">
                    kejadian
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-zinc-400">
                      Magnitudo Tertinggi
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {earthquakes.length > 0
                        ? `M ${Math.max(...earthquakes.map((eq) => eq.magnitude)).toFixed(1)}`
                        : "M 0.0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2">
                    <span className="text-slate-600 dark:text-zinc-400">
                      Status
                    </span>
                    <span
                      className={`font-bold ${
                        earthquakes.some((eq) => eq.magnitude >= 5)
                          ? "text-red-600 dark:text-red-400"
                          : earthquakes.some((eq) => eq.magnitude >= 4)
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {earthquakes.some((eq) => eq.magnitude >= 5)
                        ? "Waspada"
                        : earthquakes.some((eq) => eq.magnitude >= 4)
                          ? "Siaga"
                          : "Aman"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget 3: System Status */}
          <Card className="border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Status Sistem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      BMKG Data
                    </span>
                  </div>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                    Online
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Database
                    </span>
                  </div>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      WebSocket
                    </span>
                  </div>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                    Connected
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
