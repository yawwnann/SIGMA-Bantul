"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  earthquakeApi,
  hazardZoneApi,
  publicFacilityApi,
  roadApi,
  evacuationLocationApi,
} from "@/api";
import { analysisApi } from "@/api/analysis";
import { setBantulPolygon, isWithinBantul } from "@/lib/bantul-boundary";
import { socketService } from "@/lib/socket";
import type {
  Earthquake,
  EvacuationLocation,
  HazardZone,
  PublicFacility,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Car,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
// Import hook dan service baru untuk nearby evacuationLocations
import { useUserLocation } from "@/hooks/use-user-location";
import { evacuationService } from "@/services/evacuation.service";
import {
  getCurrentPositionRobust,
  saveLastKnownLocation,
} from "@/lib/geolocation-utils";
import { ManualLocationModal } from "@/components/manual-location-modal";

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

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

// --- Main Component ---
export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  // Auto-request user location (NEW) - iOS-optimized with delay and shorter timeout
  const { location: userLocation } = useUserLocation(true);

  // Data State
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  // Separate state for Bantul earthquakes only (for card display)
  const [bantulEarthquakes, setBantulEarthquakes] = useState<Earthquake[]>([]);
  const [evacuationLocations, setEvacuationLocations] = useState<
    EvacuationLocation[]
  >([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roadNetwork, setRoadNetwork] = useState<any>(null);
  const [expandedEvacuationLocationId, setExpandedEvacuationLocationId] =
    useState<number | null>(null);

  // App State
  const [loading, setLoading] = useState(true);

  // Map Interactive State
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [calculatedRoute, setCalculatedRoute] = useState<any>(null);
  const [, setNearestEvacuationLocations] = useState<
    (EvacuationLocation & { distance: number })[]
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
  const [activeRouteMode, setActiveRouteMode] = useState<"walk" | "car">("car");
  const [nearbyRadius, setNearbyRadius] = useState(3);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [, setIsEvacuationLocationDetailOpen] = useState(false);
  const [redZoneEmergency, setRedZoneEmergency] = useState<Earthquake | null>(
    null,
  );
  const processedEmergencyRef = useRef<string | null>(null);

  // Navigation booking state
  const [navigatingToId, setNavigatingToId] = useState<number | null>(null);
  const [destinationShelterId, setDestinationShelterId] = useState<
    number | null
  >(null);
  const [evacueeCount, setEvacueeCount] = useState<number>(1);
  const navigatingWatchRef = useRef<number | null>(null);

  // Track if initial data has been loaded (for WebSocket buffering)
  const initialDataLoadedRef = useRef(false);
  const pendingEarthquakesRef = useRef<Earthquake[]>([]);

  // GPS Tracking state
  const [trackingInfo, setTrackingInfo] = useState<{
    distance: number;
    distanceKm: number;
    eta: number;
    arrived: boolean;
  } | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getDeviceId = useCallback(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("deviceId", id);
    }
    return id;
  }, []);

  // Manual location modal state
  const [manualLocationModalOpen, setManualLocationModalOpen] = useState(false);
  const [pendingEarthquake, setPendingEarthquake] = useState<Earthquake | null>(
    null,
  );

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());

    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Restore active navigation from localStorage + fetch live tracking from backend
    const restoreNavigation = async () => {
      try {
        const activeNavData = localStorage.getItem("activeNavigation");
        if (!activeNavData) return;

        const parsed = JSON.parse(activeNavData);
        // Check if not expired (45 minutes)
        if (Date.now() - parsed.timestamp < 45 * 60 * 1000) {
          const deviceId = getDeviceId();

          // Restore basic state
          setNavigatingToId(parsed.shelterId);
          setDestinationShelterId(parsed.shelterId);
          setEvacueeCount(parsed.evacueeCount || 1);
          setDestinationName(parsed.name);
          setRouteEnd({ lat: parsed.lat, lng: parsed.lng });

          // Re-calculate route
          setTimeout(() => {
            calculateRouteToEvacuationLocation(
              parsed.lat,
              parsed.lng,
              parsed.name,
              parsed.shelterId,
            );
          }, 1000);

          // Fetch live tracking from backend
          try {
            const status =
              await evacuationLocationApi.getNavigationStatus(deviceId);
            if (status.active && status.shelterId === parsed.shelterId) {
              // Restore tracking info from backend
              setTrackingInfo({
                distance: status.distanceRemaining,
                distanceKm: status.distanceKm,
                eta: status.eta,
                arrived: status.status === "ARRIVED",
              });

              // If already arrived, trigger arrival flow
              if (status.status === "ARRIVED") {
                toast.success(
                  "Selamat datang kembali! Anda telah tiba di lokasi evakuasi sebelumnya.",
                  {
                    description: "Navigasi sebelumnya telah tercatat.",
                    duration: 10000,
                    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
                  },
                );
                // Auto-clear navigation
                evacuationLocationApi
                  .stopNavigation(parsed.shelterId, deviceId)
                  .catch(() => {});
                localStorage.removeItem("activeNavigation");
                setNavigatingToId(null);
                setDestinationShelterId(null);
                setCalculatedRoute(null);
                setRouteStart(null);
                setRouteEnd(null);
                setDestinationName("Tujuan");
                stopTracking();
                return;
              }

              toast.info("Navigasi dipulihkan", {
                description: `Jarak tersisa: ${status.distanceKm} km, ETA: ${status.eta} menit`,
                duration: 5000,
              });
            }
          } catch (trackErr) {
            // Backend might not have the session, that's ok
            console.warn("Could not restore tracking from backend:", trackErr);
          }
        } else {
          localStorage.removeItem("activeNavigation");
        }
      } catch (e) {
        console.error("Failed to restore navigation state:", e);
      }
    };

    restoreNavigation();

    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const evacuationLocationsRef = useRef(evacuationLocations);
  useEffect(() => {
    evacuationLocationsRef.current = evacuationLocations;
  }, [evacuationLocations]);
  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  const emergencyHandlerRef = useRef<() => void>(() => {});

  const handleEmergencyEvacuation = useCallback(() => {
    const currentEvacuationLocations = evacuationLocationsRef.current;

    if (currentEvacuationLocations.length === 0) {
      toast.info("Mencari rute evakuasi darurat...", {
        description:
          "Data evacuationLocation belum tersedia, mohon tunggu sebentar",
        duration: 5000,
      });
      return;
    }

    setGettingLocation(true);

    getCurrentPositionRobust(
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

        let availableEvacuationLocations = currentEvacuationLocations.filter(
          (s) => {
            const availCap =
              s.availableCapacity !== undefined
                ? s.availableCapacity
                : s.capacity - (s.currentOccupancy ?? 0);
            return availCap > 0;
          },
        );
        if (availableEvacuationLocations.length === 0) {
          availableEvacuationLocations = [...currentEvacuationLocations];
        }

        let nearestEvacuationLocation = availableEvacuationLocations[0];
        let minDistance = Infinity;
        availableEvacuationLocations.forEach((s) => {
          const coords = s.geometry as { coordinates: [number, number] };
          const dist = calculateDistance(
            userLat,
            userLng,
            coords.coordinates[1],
            coords.coordinates[0],
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestEvacuationLocation = s;
          }
        });

        const targetCoords = nearestEvacuationLocation.geometry as {
          coordinates: [number, number];
        };

        setSelectedLocation({ lat: userLat, lng: userLng });
        setRoutingMode(true);

        try {
          toast.info(`Menghitung rute ke ${nearestEvacuationLocation.name}...`);
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
          setDestinationName(nearestEvacuationLocation.name);
          setIsMapExpanded(true);
          toast.success(
            `Rute darurat ke ${nearestEvacuationLocation.name} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error(
            "[Emergency] Error calculating emergency route:",
            error,
          );
          toast.error("Gagal menghitung rute darurat dari lokasi saat ini.", {
            description:
              "Silakan coba lagi atau pilih evacuationLocation secara manual",
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
          description: `${errorDescription} (debug: app/page.tsx - line 309, error_code: ${error.code})`,
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

  const processEmergencyFlow = useCallback(async (eq: Earthquake) => {
    setGettingLocation(true);
    toast.info("Memproses respons darurat...", {
      description:
        "Sedang mendapatkan koordinat lokasi Anda untuk menentukan zona keselamatan.",
      duration: 4000,
    });

    getCurrentPositionRobust(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Save location for future fallback
        saveLastKnownLocation(userLat, userLng);
        setSelectedLocation({ lat: userLat, lng: userLng });

        const distKm = calculateDistance(userLat, userLng, eq.lat, eq.lon);
        const distMeters = distKm * 1000;
        const baseRadius = Math.pow(eq.magnitude, 2.5) * 50;

        console.log(
          `[Emergency Flow] User coords: ${userLat}, ${userLng}. Dist: ${distMeters.toFixed(1)}m. baseRadius: ${baseRadius.toFixed(1)}m`,
        );

        setSelectedEarthquake(eq);

        if (distMeters <= baseRadius) {
          // RED ZONE - always show warning regardless of Bantul boundary
          setRedZoneEmergency(eq);
          setFlyToLocation({ lat: eq.lat, lon: eq.lon, zoom: 14 });
          setCalculatedRoute(null);
          setRouteStart(null);
          setRouteEnd(null);
          setGettingLocation(false);
          toast.error("🔴 ANDA BERADA DI ZONA MERAH (BAHAYA TINGGI)", {
            description:
              "Bahaya reruntuhan tinggi! Tetap berlindung di tempat aman/shelter-in-place.",
            duration: 10000,
          });
        } else if (distMeters <= baseRadius * 6) {
          // YELLOW or GREEN ZONE
          const isYellow = distMeters <= baseRadius * 3;
          toast.info(
            isYellow
              ? "🟡 Anda berada di Zona Kuning (Dampak Menengah)"
              : "🟢 Anda berada di Zona Hijau (Dampak Ringan)",
            {
              description:
                "Mencari rute evakuasi otomatis menuju lokasi terdekat...",
              duration: 5000,
            },
          );

          // Check Bantul boundary AFTER zone detection - only block auto-routing
          if (!isWithinBantul(userLat, userLng)) {
            setFlyToLocation({ lat: eq.lat, lon: eq.lon, zoom: 11 });
            setGettingLocation(false);
            toast.warning("Lokasi Anda terdeteksi di luar Bantul.", {
              description:
                "Sistem evakuasi otomatis hanya mendukung wilayah Kabupaten Bantul. Gunakan peta untuk navigasi manual.",
              duration: 8000,
            });
            return;
          }

          // Get or fetch evacuation locations
          let locations = evacuationLocationsRef.current;
          if (locations.length === 0) {
            try {
              locations = await evacuationService.getNearbyEvacuationLocations({
                lat: userLat,
                lng: userLng,
                radius: 15,
                limit: 15,
              });
              setEvacuationLocations(locations);
            } catch (err) {
              console.error("Gagal memuat tempat evakuasi secara dinamis", err);
            }
          }

          // Filter by capacity
          let availableLocations = locations.filter((s) => {
            const availCap =
              s.availableCapacity !== undefined
                ? s.availableCapacity
                : s.capacity - (s.currentOccupancy ?? 0);
            return availCap > 0;
          });
          if (availableLocations.length === 0) {
            availableLocations = [...locations];
          }

          if (availableLocations.length === 0) {
            toast.error("Tidak ada lokasi evakuasi terdekat yang ditemukan.", {
              description:
                "Silakan pantau pengumuman keselamatan atau pilih lokasi manual.",
            });
            setGettingLocation(false);
            setFlyToLocation({ lat: eq.lat, lon: eq.lon, zoom: 12 });
            return;
          }

          // Find nearest available
          let nearestLoc = availableLocations[0];
          let minDistance = Infinity;

          availableLocations.forEach((s) => {
            const coords = s.geometry as { coordinates: [number, number] };
            const d = calculateDistance(
              userLat,
              userLng,
              coords.coordinates[1],
              coords.coordinates[0],
            );
            if (d < minDistance) {
              minDistance = d;
              nearestLoc = s;
            }
          });

          const targetCoords = nearestLoc.geometry as {
            coordinates: [number, number];
          };

          setRoutingMode(true);

          try {
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
            setDestinationName(nearestLoc.name);
            // Store the shelter ID for booking later (user must press "Menuju Kesana")
            setDestinationShelterId(nearestLoc.id);
            setIsMapExpanded(true);
            setFlyToLocation({ lat: userLat, lon: userLng, zoom: 14 });

            toast.success(
              `Rute evakuasi ke ${nearestLoc.name} berhasil ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
              { duration: 8000 },
            );
          } catch (routeErr) {
            console.error("Error calculating emergency route:", routeErr);
            toast.error("Gagal menghitung rute evakuasi darurat otomatis.", {
              description:
                "Coba pilih tempat evakuasi secara manual pada panel informasi.",
              duration: 8000,
            });
          } finally {
            setGettingLocation(false);
          }
        } else {
          // OUTSIDE ZONE
          setFlyToLocation({ lat: eq.lat, lon: eq.lon, zoom: 11 });
          setCalculatedRoute(null);
          setRouteStart(null);
          setRouteEnd(null);
          setGettingLocation(false);
          toast.success("Safe Zone: Anda berada di luar radius dampak gempa.", {
            description: `Jarak Anda ke pusat gempa: ${distKm.toFixed(1)} km. Memfokuskan peta ke episentrum gempa.`,
            duration: 8000,
          });
        }
      },
      (error) => {
        console.error("[Emergency Geolocation Error]", error);
        setGettingLocation(false);

        // Determine error type
        const isPermissionDenied = error.code === error.PERMISSION_DENIED;
        const errorMessage = isPermissionDenied
          ? "Izin lokasi ditolak. Silakan pilih metode alternatif."
          : "Gagal mendapatkan lokasi GPS Anda.";

        toast.error(errorMessage, {
          description: isPermissionDenied
            ? "Pilih lokasi manual atau gunakan lokasi terakhir yang tersimpan."
            : "Silakan coba lagi atau gunakan lokasi manual.",
          duration: 8000,
        });

        // Open manual location modal for user to select alternative
        setPendingEarthquake(eq);
        setManualLocationModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }, []);

  const processEmergencyFlowRef = useRef<(eq: Earthquake) => void>(() => {});
  useEffect(() => {
    processEmergencyFlowRef.current = processEmergencyFlow;
  }, [processEmergencyFlow]);

  // Handle manual location selection from ManualLocationModal
  const handleManualLocationSelected = useCallback(
    (location: { lat: number; lng: number; source: string }) => {
      setManualLocationModalOpen(false);

      if (!pendingEarthquake) return;

      const eq = pendingEarthquake;
      const userLat = location.lat;
      const userLng = location.lng;

      // Save if it's a valid location
      if (location.source !== "manual" || (userLat && userLng)) {
        saveLastKnownLocation(userLat, userLng);
      }

      setSelectedLocation({ lat: userLat, lng: userLng });

      const distKm = calculateDistance(userLat, userLng, eq.lat, eq.lon);
      const distMeters = distKm * 1000;
      const baseRadius = Math.pow(eq.magnitude, 2.5) * 50;

      console.log(
        `[Manual Location] Source: ${location.source}, Coords: ${userLat}, ${userLng}. Dist: ${distMeters.toFixed(1)}m. baseRadius: ${baseRadius.toFixed(1)}m`,
      );

      setSelectedEarthquake(eq);

      if (distMeters <= baseRadius) {
        // RED ZONE
        setRedZoneEmergency(eq);
        setFlyToLocation({ lat: eq.lat, lon: eq.lon, zoom: 14 });
        setCalculatedRoute(null);
        setRouteStart(null);
        setRouteEnd(null);
        setGettingLocation(false);
        toast.error("🔴 ANDA BERADA DI ZONA MERAH (BAHAYA TINGGI)", {
          description:
            location.source === "manual"
              ? "Lokasi manual terdeteksi di zona bahaya. Tetap berlindung di tempat aman."
              : "Bahaya reruntuhan tinggi! Tetap berlindung di tempat aman/shelter-in-place.",
          duration: 10000,
        });
      } else if (distMeters <= baseRadius * 6) {
        // YELLOW or GREEN ZONE
        const isYellow = distMeters <= baseRadius * 3;
        toast.info(
          isYellow
            ? "🟡 Anda berada di Zona Kuning (Dampak Menengah)"
            : "🟢 Anda berada di Zona Hijau (Dampak Ringan)",
          {
            description:
              "Mencari rute evakuasi otomatis menuju lokasi terdekat...",
            duration: 5000,
          },
        );

        // Get or fetch evacuation locations
        const locations = evacuationLocationsRef.current;
        if (locations.length === 0) {
          evacuationService
            .getNearbyEvacuationLocations({
              lat: userLat,
              lng: userLng,
              radius: 15,
              limit: 15,
            })
            .then((loc) => {
              setEvacuationLocations(loc);
              return loc;
            })
            .catch((err) => {
              console.error("Gagal memuat tempat evakuasi", err);
              return [];
            })
            .then((res) => {
              const availableLocations = res.filter((s) => {
                const availCap =
                  s.availableCapacity !== undefined
                    ? s.availableCapacity
                    : s.capacity - (s.currentOccupancy ?? 0);
                return availCap > 0;
              });
              if (availableLocations.length === 0) return;

              let nearestLoc = availableLocations[0];
              let minDistance = Infinity;

              availableLocations.forEach((s) => {
                const coords = s.geometry as { coordinates: [number, number] };
                const d = calculateDistance(
                  userLat,
                  userLng,
                  coords.coordinates[1],
                  coords.coordinates[0],
                );
                if (d < minDistance) {
                  minDistance = d;
                  nearestLoc = s;
                }
              });

              const targetCoords = nearestLoc.geometry as {
                coordinates: [number, number];
              };
              setRoutingMode(true);

              roadApi
                .calculateRoute(
                  userLat,
                  userLng,
                  targetCoords.coordinates[1],
                  targetCoords.coordinates[0],
                )
                .then((route) => {
                  setCalculatedRoute(route);
                  setRouteStart({ lat: userLat, lng: userLng });
                  setRouteEnd({
                    lat: targetCoords.coordinates[1],
                    lng: targetCoords.coordinates[0],
                  });
                  setDestinationName(nearestLoc.name);
                  setIsMapExpanded(true);
                  setFlyToLocation({ lat: userLat, lon: userLng, zoom: 14 });
                  toast.success(
                    `Rute evakuasi ke ${nearestLoc.name} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
                    { duration: 8000 },
                  );
                })
                .catch((routeErr) => {
                  console.error("Error calculating route:", routeErr);
                  toast.error("Gagal menghitung rute evakuasi.", {
                    duration: 8000,
                  });
                })
                .finally(() => setGettingLocation(false));
            });
        }
      } else {
        // OUTSIDE ZONE
        setFlyToLocation({ lat: eq.lat, lon: eq.lon, zoom: 11 });
        setCalculatedRoute(null);
        setRouteStart(null);
        setRouteEnd(null);
        setGettingLocation(false);
        toast.success("Safe Zone: Anda berada di luar radius dampak gempa.", {
          description: `Jarak Anda ke pusat gempa: ${distKm.toFixed(1)} km. Memfokuskan peta ke episentrum.`,
          duration: 8000,
        });
      }
    },
    [pendingEarthquake],
  );

  useEffect(() => {
    emergencyHandlerRef.current = handleEmergencyEvacuation;
  }, [handleEmergencyEvacuation]);

  const fetchData = async () => {
    setLoading(true);

    // Calculate 24 hours ago in WIB timezone (UTC+7)
    // BMKG Indonesia uses WIB, so filter should match
    const now = new Date();
    const wibOffset = 7 * 60 * 60 * 1000; // WIB is UTC+7
    const nowWIB = new Date(now.getTime() + wibOffset);
    const oneDayAgoWIB = new Date(nowWIB.getTime() - 24 * 60 * 60 * 1000);

    try {
      const [hazardData, earthquakesResponse, facilitiesData, roadNetworkData] =
        await Promise.all([
          hazardZoneApi.getAll().catch(() => []),
          earthquakeApi
            .getAll({
              // Filter 24 jam terakhir dalam WIB timezone
              startDate: oneDayAgoWIB.toISOString(),
              endDate: nowWIB.toISOString(),
              limit: 1000,
            })
            .catch(() => ({ data: [], total: 0, page: 1, limit: 1000 })),
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
      // Don't fetch all evacuationLocations here - will fetch nearby evacuationLocations based on user location
      setHazardZones(hazardData as HazardZone[]);
      // Show ALL earthquakes from 24h (not filtered by Bantul) so users can see impact radius
      const filteredEarthquakes = earthquakesResponse.data.filter(
        (eq: Earthquake) => eq.lat != null && eq.lon != null,
      );
      setEarthquakes(filteredEarthquakes);

      const filteredBantul = filteredEarthquakes.filter((eq: Earthquake) =>
        isWithinBantul(eq.lat, eq.lon),
      );
      setBantulEarthquakes(filteredBantul);

      setFacilities(facilitiesData as PublicFacility[]);
      setRoadNetwork(roadNetworkData);

      // Mark initial data as loaded and flush pending earthquakes
      initialDataLoadedRef.current = true;
      if (pendingEarthquakesRef.current.length > 0) {
        // Add any pending earthquakes that came in while loading
        const pendingToAdd = pendingEarthquakesRef.current.filter(
          (newEq) => !filteredEarthquakes.some((eq) => eq.id === newEq.id),
        );
        if (pendingToAdd.length > 0) {
          setEarthquakes((prev) => [...pendingToAdd, ...prev].slice(0, 99));
          const bantulPending = pendingToAdd.filter((eq) =>
            isWithinBantul(eq.lat, eq.lon),
          );
          if (bantulPending.length > 0) {
            setBantulEarthquakes((prev) =>
              [...bantulPending, ...prev].slice(0, 99),
            );
          }
        }
        pendingEarthquakesRef.current = [];
      }
    } catch (err) {
      console.error(err);
      initialDataLoadedRef.current = true; // Still mark as loaded on error
    } finally {
      setLoading(false);
    }
  };

  // Use ref to track the last location we fetched for, to prevent spamming API on slight GPS jitter
  const lastFetchedLocRef = useRef<{ lat: number; lng: number } | null>(null);

  // NEW: Fetch nearby evacuationLocations when user location is available and has moved significantly
  useEffect(() => {
    if (!userLocation) return;

    // Check if we already fetched for a nearby location (within ~50 meters)
    // 0.0005 degrees is roughly 55 meters
    if (lastFetchedLocRef.current) {
      const dLat = Math.abs(userLocation.lat - lastFetchedLocRef.current.lat);
      const dLng = Math.abs(userLocation.lng - lastFetchedLocRef.current.lng);
      if (dLat < 0.0005 && dLng < 0.0005) {
        return; // User hasn't moved enough to warrant a new fetch
      }
    }

    const fetchNearbyEvacuationLocations = async () => {
      try {
        console.log(
          "[Dashboard] Fetching nearby evacuationLocations for location:",
          userLocation,
        );
        lastFetchedLocRef.current = {
          lat: userLocation.lat,
          lng: userLocation.lng,
        };
        const nearbyEvacuationLocations =
          await evacuationService.getNearbyEvacuationLocations({
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: nearbyRadius,
            limit: 10, // max 10 evacuationLocations
          });

        console.log(
          "[Dashboard] Found nearby evacuationLocations:",
          nearbyEvacuationLocations.length,
        );
        setEvacuationLocations(
          nearbyEvacuationLocations as EvacuationLocation[],
        );

        if (nearbyEvacuationLocations.length > 0) {
          toast.success(
            `Ditemukan ${nearbyEvacuationLocations.length} lokasi evakuasi terdekat`,
          );
        }
      } catch (error: unknown) {
        console.error(
          "[Dashboard] Error fetching nearby evacuationLocations:",
          error,
        );
        toast.error(
          (error as Error).message || "Gagal memuat lokasi evakuasi terdekat",
        );
        setEvacuationLocations([]); // Set empty if error
      }
    };

    fetchNearbyEvacuationLocations();
  }, [userLocation?.lat, userLocation?.lng, nearbyRadius]);

  const hasFlownToUserRef = useRef(false);

  // NEW: Auto set selected location and fly to user location when available (ONLY ONCE)
  useEffect(() => {
    if (!userLocation || hasFlownToUserRef.current) return;

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

    hasFlownToUserRef.current = true;
  }, [userLocation]);

  useEffect(() => {
    fetchData();

    // Periodic refresh dihapus karena sudah digantikan sepenuhnya oleh WebSocket (onNewEarthquake & onDashboardStats)
    // agar layar tidak memunculkan efek loading setiap 5 menit.

    socketService.connect();

    // Listen for dashboard stats updates (auto-refresh)
    const unsubscribeDashboardStats = socketService.onDashboardStats(
      (stats) => {
        console.log(
          "[Dashboard] Dashboard stats updated via WebSocket:",
          stats,
        );
        // Update earthquakes list if there's a new latest earthquake
        // Removed setEarthquakes here to prevent the "1 to 5" glitch on initial load.
        // Real-time earthquake updates are already handled by socketService.onNewEarthquake below.
      },
    );

    // Listen for evacuation capacity updates (real-time marker updates)
    const unsubscribeCapacity = socketService.onEvacuationCapacityUpdate(
      (data) => {
        console.log("[Dashboard] Evacuation capacity updated:", data);
        // Update the evacuation location in state - create new array to force re-render
        setEvacuationLocations((prev) => {
          // Create a new array with the updated location to ensure re-render
          const updated = prev.map((loc) =>
            loc.id === data.id
              ? {
                  ...loc,
                  currentOccupancy: data.currentOccupancy,
                  capacity: data.totalCapacity,
                }
              : loc,
          );
          // Return new array reference to trigger React re-render
          return [...updated];
        });
        // Show toast notification
        if (data.availableCapacity === 0) {
          toast.warning(`${data.name} sudah penuh!`, {
            description: "Kapasitas tersedia: 0 orang",
          });
        }
      },
    );

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
        processEmergencyFlowRef.current(newEq);
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
            ? "Segera evakuasi ke tempat evakuasi terdekat!"
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
          <div className="text-xs text-blue-600 mt-1 font-semibold">
            Klik untuk melihat detail & panduan keselamatan
          </div>
        </div>,
        { duration: 15000 },
      );

      // Buffer earthquakes until initial data is loaded
      // This prevents race conditions between API fetch and WebSocket
      if (!initialDataLoadedRef.current) {
        // Buffer if not already in buffer
        const alreadyBuffered = pendingEarthquakesRef.current.some(
          (eq) => eq.id === newEq.id,
        );
        if (!alreadyBuffered) {
          pendingEarthquakesRef.current.push(newEq);
        }
        return;
      }

      // Initial data loaded - add earthquake directly with deduplication
      setEarthquakes((prev) => {
        const exists = prev.some((eq) => eq.id === newEq.id);
        if (exists) return prev;
        return [newEq, ...prev.slice(0, 99)];
      });
      if (eqInBantul) {
        setBantulEarthquakes((prev) => {
          const exists = prev.some((eq) => eq.id === newEq.id);
          if (exists) return prev;
          return [newEq, ...prev.slice(0, 99)];
        });
      }
    });

    return () => {
      unsubscribeEarthquake();
      unsubscribeDashboardStats();
      unsubscribeCapacity();
      socketService.disconnect();
    };
  }, []);

  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      if (!isWithinBantul(lat, lng)) {
        return;
      }
      setSelectedLocation({ lat, lng });
      if (evacuationLocations.length > 0) {
        const withDistance = evacuationLocations.map((evacuationLocation) => {
          const coords = evacuationLocation.geometry as {
            coordinates: [number, number];
          };
          const distance = calculateDistance(
            lat,
            lng,
            coords.coordinates[1],
            coords.coordinates[0],
          );
          return { ...evacuationLocation, distance };
        });
        withDistance.sort((a, b) => a.distance - b.distance);
        setNearestEvacuationLocations(withDistance.slice(0, 3));
      }
    },
    [evacuationLocations],
  );

  // Handle emergency routing from push notification click or toast
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const emergencyParam = searchParams.get("emergency");

    if (emergencyParam) {
      // Prevent duplicate processing
      if (processedEmergencyRef.current === emergencyParam) return;
      processedEmergencyRef.current = emergencyParam;

      // Clean up URL parameter immediately to avoid re-triggering
      window.history.replaceState({}, document.title, window.location.pathname);

      const runEmergency = async () => {
        try {
          let targetEq: Earthquake | null = null;

          if (emergencyParam === "true") {
            // Fallback: get the latest earthquake
            targetEq = await earthquakeApi.getLatest();
          } else {
            const eqId = Number(emergencyParam);
            if (!isNaN(eqId)) {
              // Try to find in the already loaded list
              targetEq = earthquakes.find((e) => e.id === eqId) || null;
              if (!targetEq) {
                // Fetch from API
                targetEq = await earthquakeApi.getById(eqId);
              }
            }
          }

          if (targetEq) {
            processEmergencyFlow(targetEq);
          } else {
            toast.error("Data gempa darurat tidak ditemukan.");
          }
        } catch (err) {
          console.error("Gagal memproses data gempa darurat:", err);
          toast.error("Terjadi kesalahan saat memproses data gempa darurat.");
        }
      };

      runEmergency();
    }
  }, [earthquakes, processEmergencyFlow]);

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

  const calculateRouteToEvacuationLocation = async (
    evacuationLocationLat: number,
    evacuationLocationLng: number,
    evacuationLocationName: string,
    evacuationLocationId?: number,
  ) => {
    // Jika routing mode ON tanpa routeStart, set tujuan dulu
    if (routingMode && !routeStart) {
      setRouteEnd({ lat: evacuationLocationLat, lng: evacuationLocationLng });
      toast.info(
        `Tujuan di set ke ${evacuationLocationName}. Klik pada peta untuk memilih titik awal evakuasi Anda.`,
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

    getCurrentPositionRobust(
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
            evacuationLocationLat,
            evacuationLocationLng,
          );

          setCalculatedRoute(route);
          setRouteStart({ lat: startLat, lng: startLng });
          setRouteEnd({
            lat: evacuationLocationLat,
            lng: evacuationLocationLng,
          });
          setDestinationName(evacuationLocationName);
          // Store shelter ID for booking later
          if (evacuationLocationId)
            setDestinationShelterId(evacuationLocationId);
          setIsMapExpanded(true);

          const threateningEq = earthquakes.find((eq) =>
            isThreatened(startLat, startLng, eq.lat, eq.lon, eq.magnitude),
          );
          if (threateningEq) setSelectedEarthquake(threateningEq);

          toast.success(
            `Rute ke ${evacuationLocationName} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
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
        toast.error(
          `Gagal mendapatkan lokasi Anda. (debug: app/page.tsx - line 917, error_code: ${error.code})`,
        );
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

  // === GPS TRACKING INTERVAL ===
  const startTracking = useCallback(() => {
    // Clear existing interval if any
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
    }

    let lastTrackedLat: number | null = null;
    let lastTrackedLng: number | null = null;

    trackingIntervalRef.current = setInterval(async () => {
      if (!navigatingToId || !userLocation) return;

      const { lat, lng } = userLocation;

      // Only track if position changed significantly (> 5 meters)
      if (lastTrackedLat !== null && lastTrackedLng !== null) {
        const movedDist = calculateDistance(
          lastTrackedLat,
          lastTrackedLng,
          lat,
          lng,
        );
        if (movedDist < 0.005) return; // Skip if moved less than 5 meters
      }

      lastTrackedLat = lat;
      lastTrackedLng = lng;

      try {
        const result = await evacuationLocationApi.trackPosition(
          navigatingToId,
          {
            deviceId: getDeviceId(),
            lat,
            lng,
            heading: userLocation.heading,
            speed: userLocation.speed,
            accuracy: userLocation.accuracy,
          },
        );

        if (result.success) {
          setTrackingInfo({
            distance: result.distance,
            distanceKm: result.distanceKm,
            eta: result.eta,
            arrived: result.arrived,
          });

          // If arrived, stop tracking
          if (result.arrived) {
            if (trackingIntervalRef.current) {
              clearInterval(trackingIntervalRef.current);
              trackingIntervalRef.current = null;
            }
          }
        }
      } catch (e) {
        // Silent fail - don't spam console
      }
    }, 5000); // Track every 5 seconds
  }, [navigatingToId, userLocation, getDeviceId]);

  const stopTracking = useCallback(() => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    setTrackingInfo(null);
  }, []);

  // === NAVIGATION BOOKING ===
  const startNavigationBooking = useCallback(async () => {
    const shelterId = destinationShelterId;
    if (!shelterId || !routeEnd) return;

    // Get current position for start coordinates
    let startLat: number | undefined;
    let startLng: number | undefined;

    if (userLocation) {
      startLat = userLocation.lat;
      startLng = userLocation.lng;
    }

    try {
      await evacuationLocationApi.startNavigation(
        shelterId,
        getDeviceId(),
        evacueeCount,
        startLat,
        startLng,
      );
      setNavigatingToId(shelterId);

      // Persist navigation session to survive page refreshes
      localStorage.setItem(
        "activeNavigation",
        JSON.stringify({
          shelterId,
          lat: routeEnd.lat,
          lng: routeEnd.lng,
          name: destinationName,
          evacueeCount,
          timestamp: Date.now(),
        }),
      );

      // Start GPS tracking
      startTracking();

      toast.success(
        "Navigasi dimulai! Kapasitas lokasi evakuasi telah di-booking untuk Anda.",
        {
          description:
            "Geofencing aktif — sistem akan mendeteksi otomatis saat Anda tiba.",
          duration: 6000,
          icon: <Navigation className="w-5 h-5 text-blue-600" />,
        },
      );
    } catch (err: unknown) {
      console.error("Failed to start navigation booking:", err);
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Gagal memulai navigasi.";
      toast.error(msg, { duration: 6000 });
    }
  }, [
    destinationShelterId,
    routeEnd,
    userLocation,
    getDeviceId,
    evacueeCount,
    destinationName,
    startTracking,
  ]);

  const cancelNavigation = useCallback(async () => {
    stopTracking(); // Stop GPS tracking

    if (navigatingToId) {
      try {
        await evacuationLocationApi.stopNavigation(
          navigatingToId,
          getDeviceId(),
        );
      } catch (e) {
        // Silent fail
      }
    }
    localStorage.removeItem("activeNavigation");
    setNavigatingToId(null);
    setDestinationShelterId(null);
    setCalculatedRoute(null);
    setRouteStart(null);
    setRouteEnd(null);
    setDestinationName("Tujuan");
    toast.info("Navigasi dibatalkan. Booking kapasitas telah dibebaskan.");
  }, [navigatingToId, getDeviceId, stopTracking]);

  // === GEOFENCING AUTO-ARRIVE ===
  useEffect(() => {
    if (!userLocation || !routeEnd || !navigatingToId) return;

    const distanceToDestination = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      routeEnd.lat,
      routeEnd.lng,
    );

    // If within 50 meters (0.05 km)
    if (distanceToDestination <= 0.05) {
      stopTracking(); // Stop GPS tracking interval

      toast.success("Anda telah tiba di lokasi evakuasi!", {
        description: "Silakan melapor ke petugas yang bertugas di lokasi.",
        duration: 15000,
        icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      });

      // Auto-arrive: stop navigation booking
      evacuationLocationApi
        .stopNavigation(navigatingToId, getDeviceId())
        .catch(() => {
          // Silent fail
        });

      // Clear persisted state
      localStorage.removeItem("activeNavigation");

      // Reset navigation state
      setNavigatingToId(null);
      setDestinationShelterId(null);
      setCalculatedRoute(null);
      setRouteStart(null);
      setRouteEnd(null);
      setDestinationName("Tujuan");
    }
  }, [userLocation, routeEnd, navigatingToId, getDeviceId, stopTracking]);

  // === AUTO-START GPS TRACKING ===
  useEffect(() => {
    if (navigatingToId && userLocation) {
      startTracking();
    }
    return () => {
      // Cleanup will be handled by cancelNavigation or auto-arrive
    };
  }, [navigatingToId, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup navigation on unmount
  useEffect(() => {
    return () => {
      if (navigatingWatchRef.current) {
        navigator.geolocation.clearWatch(navigatingWatchRef.current);
      }
    };
  }, []);

  const isDark = mounted && theme === "dark";

  return (
    <>
      {/* Global Loading Overlay for Routing */}
      {gettingLocation && (
        <div className="fixed inset-0 z-9999 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 rounded-2xl flex flex-col items-center shadow-2xl max-w-sm text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
              Mencari Rute Evakuasi...
            </h2>
            <p className="text-slate-600 dark:text-zinc-400 text-sm">
              Sedang melacak lokasi Anda dan menghitung rute teraman menuju
              evacuationLocation terdekat. Mohon tunggu sebentar.
            </p>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 lg:p-8 min-h-screen space-y-6 max-w-400 mx-auto">
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
              : "relative w-full h-[55vh] min-h-[112.5px] rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm bg-slate-100 dark:bg-zinc-900 transition-all duration-300 flex flex-col"
          }
        >
          {/* Loading Indicator Overlay */}
          {calculatingRoute && (
            <div className="absolute inset-0 z-2000 bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl transition-all duration-300">
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
          <div className="absolute top-4 right-4 z-50 flex flex-row gap-2">
            {/* Info Panel Toggle */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
              <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-zinc-800 shadow-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors h-10 w-10">
                <Info className="h-5 w-5 text-slate-700 dark:text-zinc-300" />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-95 p-0 bg-slate-50 dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 z-[70]"
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
                  {/* Nearest EvacuationLocation Module */}
                  {evacuationLocations.length > 0 && selectedLocation && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                        <span>5 EvacuationLocation Terdekat</span>
                        <Badge variant="outline" className="text-xs">
                          {evacuationLocations.length} total
                        </Badge>
                      </h2>
                      <div className="space-y-2">
                        {evacuationLocations
                          .slice(0, 5)
                          .map((evacuationLocation, i) => {
                            const coords = evacuationLocation.geometry as {
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
                                key={evacuationLocation.id}
                                className={`bg-white dark:bg-zinc-900 shadow-sm cursor-pointer transition-colors ${expandedEvacuationLocationId === evacuationLocation.id ? "border-primary ring-1 ring-primary" : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"}`}
                                onClick={() =>
                                  setExpandedEvacuationLocationId(
                                    expandedEvacuationLocationId ===
                                      evacuationLocation.id
                                      ? null
                                      : evacuationLocation.id,
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
                                          {evacuationLocation.name}
                                        </p>
                                      </div>
                                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                        {distance.toFixed(2)} km
                                      </p>
                                    </div>
                                  </div>

                                  {expandedEvacuationLocationId ===
                                    evacuationLocation.id && (
                                    <div className="mt-2 pt-3 border-t border-slate-100 dark:border-zinc-800/60 animate-in fade-in slide-in-from-top-2 flex flex-col gap-2.5">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                            Kondisi
                                          </p>
                                          <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                            {evacuationLocation.condition}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                            Sisa Kuota Sistem
                                          </p>
                                          <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                            {evacuationLocation.availableCapacity !==
                                            undefined
                                              ? evacuationLocation.availableCapacity
                                              : evacuationLocation.capacity -
                                                (evacuationLocation.currentOccupancy ??
                                                  0)}{" "}
                                            Orang
                                          </p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                          Alamat
                                        </p>
                                        <p
                                          className="text-xs font-medium text-slate-700 dark:text-zinc-300 line-clamp-2"
                                          title={
                                            evacuationLocation.address || ""
                                          }
                                        >
                                          {evacuationLocation.address || "-"}
                                        </p>
                                      </div>
                                      <Button
                                        size="sm"
                                        className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const coords =
                                            evacuationLocation.geometry as {
                                              coordinates: [number, number];
                                            };
                                          calculateRouteToEvacuationLocation(
                                            coords.coordinates[1],
                                            coords.coordinates[0],
                                            evacuationLocation.name,
                                            evacuationLocation.id,
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
                        if (navigatingToId) {
                          cancelNavigation();
                        } else {
                          setCalculatedRoute(null);
                          setRouteStart(null);
                          setRouteEnd(null);
                          setDestinationShelterId(null);
                        }
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

                {/* Navigation Action Buttons */}
                <div className="p-3 border-t border-slate-100 dark:border-zinc-800">
                  {navigatingToId ? (
                    <div className="space-y-2">
                      {/* Active navigation indicator with live tracking */}
                      <div className="flex flex-col gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                          </span>
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                            Navigasi Aktif
                          </span>
                        </div>

                        {/* Live Distance & ETA */}
                        {trackingInfo ? (
                          <div className="flex items-center justify-between px-2 py-1 bg-white/70 dark:bg-zinc-800/50 rounded-lg">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-500" />
                              <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                                {trackingInfo.distance <= 1000
                                  ? `${trackingInfo.distance} m`
                                  : `${trackingInfo.distanceKm.toFixed(1)} km`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-sm font-semibold text-slate-600 dark:text-zinc-300">
                                {trackingInfo.eta <= 1
                                  ? "< 1 menit"
                                  : `${trackingInfo.eta} menit`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                            Mendapatkan info lokasi...
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={cancelNavigation}
                        variant="destructive"
                        className="w-full font-semibold"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Batalkan Navigasi
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Evacuee count input */}
                      <div className="flex items-center justify-between px-2 py-1 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-100 dark:border-zinc-800">
                        <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                          Jumlah Pengungsi:
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setEvacueeCount(Math.max(1, evacueeCount - 1))
                            }
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors"
                            disabled={evacueeCount <= 1}
                          >
                            -
                          </button>
                          <span className="text-sm font-semibold w-4 text-center">
                            {evacueeCount}
                          </span>
                          <button
                            onClick={() => setEvacueeCount(evacueeCount + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <Button
                        onClick={startNavigationBooking}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                        size="sm"
                        disabled={!destinationShelterId}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Menuju Kesana
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {/* End Routing Info Form/Floating Detail */}

          {/* Selected Location Floating Detail - REMOVED */}

          <div className="relative h-full w-full dark-map-container flex-1">
            <MapClient
              earthquakes={earthquakes}
              evacuationLocations={evacuationLocations}
              hazardZones={hazardZones}
              facilities={facilities}
              userLocation={userLocation}
              selectedLocation={selectedLocation}
              onLocationSelect={handleMapClick}
              onEarthquakeClick={handleEarthquakeClick}
              onCalculateRoute={calculateRouteToEvacuationLocation}
              roadNetwork={roadNetwork}
              calculatedRoute={calculatedRoute}
              routeStart={routeStart}
              routeEnd={routeEnd}
              selectedEarthquake={selectedEarthquake}
              flyToLocation={flyToLocation}
              onEvacuationLocationDetailOpen={setIsEvacuationLocationDetailOpen}
            />

            {/* Inline loading indicator - non-blocking */}
            {loading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200 dark:border-zinc-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">
                  Memuat data...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* DASHBOARD WIDGETS BELOW (Visible by scrolling down) */}
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 pt-4">
          Dashboard Analitik
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {/* Widget 1: EvacuationLocation Statistics */}
          <Card className="border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Tempat Evakuasi Tersedia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {evacuationLocations.length}
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
                      {evacuationLocations
                        .reduce((sum, s) => sum + (s.capacity || 0), 0)
                        .toLocaleString()}{" "}
                      orang
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2">
                    <span className="text-slate-600 dark:text-zinc-400">
                      Tempat Evakuasi Terdekat
                    </span>
                    <span
                      className="font-bold text-green-600 dark:text-green-400 text-right max-w-[50%] truncate"
                      title={
                        evacuationLocations.length > 0
                          ? evacuationLocations[0].name
                          : "Tidak ada"
                      }
                    >
                      {evacuationLocations.length > 0
                        ? evacuationLocations[0].name
                        : "Tidak ada"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget 2: Earthquake 24h Statistics */}
          <Card className="border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  Gempa 24 Jam di daerah Bantul
                </div>
                {/* Status Badge */}
                {loading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 ${
                      bantulEarthquakes.some((eq) => eq.magnitude >= 5)
                        ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                        : bantulEarthquakes.some((eq) => eq.magnitude >= 4)
                          ? "border-yellow-300 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "border-green-300 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                    }`}
                  >
                    {bantulEarthquakes.some((eq) => eq.magnitude >= 5)
                      ? "⚠️ Waspada"
                      : bantulEarthquakes.some((eq) => eq.magnitude >= 4)
                        ? "🔔 Siaga"
                        : "✅ Aman"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-end justify-between mb-3">
                    <div className="flex items-baseline gap-1.5">
                      <Skeleton className="h-10 w-12" />
                      <Skeleton className="h-4 w-10 mb-1" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <Skeleton className="h-3 w-24 mb-2.5" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Main Stats */}
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                          {bantulEarthquakes.length}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 mb-1">
                          gempa di Bantul
                        </span>
                      </div>
                    </div>
                    {/* Magnitude Badge */}
                    {bantulEarthquakes.length > 0 && (
                      <div
                        className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                          Math.max(
                            ...bantulEarthquakes.map((eq) => eq.magnitude),
                          ) >= 5
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : Math.max(
                                  ...bantulEarthquakes.map(
                                    (eq) => eq.magnitude,
                                  ),
                                ) >= 4
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        M{" "}
                        {Math.max(
                          ...bantulEarthquakes.map((eq) => eq.magnitude),
                        ).toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Latest Earthquake Info */}
                  {bantulEarthquakes.length > 0 &&
                    (() => {
                      const latest = bantulEarthquakes[0];
                      const eqTime = new Date(latest.time);
                      const timeAgo = getTimeAgo(eqTime);
                      return (
                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                            Gempa Terbaru
                          </div>
                          <div className="text-xs font-medium text-slate-700 dark:text-zinc-200 line-clamp-2 mb-1">
                            {latest.location}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-zinc-400">
                            <Clock className="w-3 h-3" />
                            <span>{timeAgo}</span>
                            <span>•</span>
                            <span>Kedalaman {latest.depth} km</span>
                          </div>
                        </div>
                      );
                    })()}

                  {bantulEarthquakes.length === 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 text-center">
                      <div className="text-xs text-slate-500 dark:text-zinc-400">
                        Tidak ada gempa dalam 24 jam terakhir
                      </div>
                    </div>
                  )}
                </>
              )}
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

      {/* Manual Location Modal - Fallback when GPS fails */}
      <ManualLocationModal
        isOpen={manualLocationModalOpen}
        onClose={() => {
          setManualLocationModalOpen(false);
          setGettingLocation(false);
        }}
        onLocationSelected={handleManualLocationSelected}
        earthquakeLat={pendingEarthquake?.lat}
        earthquakeLon={pendingEarthquake?.lon}
      />

      <Dialog
        open={!!redZoneEmergency}
        onOpenChange={(open) => {
          if (!open) setRedZoneEmergency(null);
        }}
      >
        <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0 overflow-hidden z-[100]">
          <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-white/80 p-6 dark:bg-zinc-950/80 backdrop-blur-2xl shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
            {/* Background warning pattern */}
            <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-red-500/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 -z-10 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl" />

            <div className="flex flex-col items-center text-center space-y-4 pt-4">
              {/* Animated Warning Icon Container */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                <AlertTriangle className="h-10 w-10 text-red-500 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <Badge
                  variant="destructive"
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 animate-bounce"
                >
                  ZONA MERAH: BAHAYA TINGGI
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-50">
                  {redZoneEmergency?.location}
                </DialogTitle>
                <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 font-mono">
                  Magnitude {redZoneEmergency?.magnitude} &middot; Kedalaman{" "}
                  {redZoneEmergency?.depth} Km
                </div>
              </div>

              <DialogDescription className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed text-left bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 rounded-2xl p-4 space-y-2.5">
                <p className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  ⚠️ Peringatan Shelter-in-Place:
                </p>
                <p className="text-xs">
                  Anda terdeteksi berada sangat dekat dengan pusat gempa.
                  **Navigasi rute otomatis dinonaktifkan** demi keselamatan Anda
                  untuk menghindari risiko reruntuhan gedung, jalan retak, atau
                  tiang listrik roboh di luar.
                </p>
                <div className="pt-2 border-t border-red-500/10 space-y-1.5 text-xs font-semibold">
                  <p className="flex items-start gap-2">
                    <span className="text-red-500">1.</span>
                    <span>
                      TETAP BERLINDUNG di bawah meja atau struktur kokoh.
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500">2.</span>
                    <span>
                      JAUHI JENDELA kaca, dinding luar, dan barang pecah belah.
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500">3.</span>
                    <span>
                      LINDUNGI KEPALA dan leher dengan bantal atau tangan Anda.
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500">4.</span>
                    <span>
                      Tunggu guncangan reda sebelum mencoba keluar ke area
                      terbuka.
                    </span>
                  </p>
                </div>
              </DialogDescription>
            </div>

            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setRedZoneEmergency(null)}
                className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-5 border-t border-red-400/20 shadow-lg shadow-red-500/20 hover:shadow-red-600/30 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <span>Saya Mengerti & Siaga</span>
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
