"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  earthquakeApi,
  shelterApi,
  hazardZoneApi,
  publicFacilityApi,
  roadApi,
} from "@/api";
import { socketService } from "@/lib/socket";
import type { Earthquake, Shelter, HazardZone, PublicFacility } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  X,
  Layers,
  Footprints,
  Bike,
  Car,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MapClient = dynamic(
  () => import("@/components/map/map-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    ),
  },
);

// --- Helpers ---
const generateChartData = (earthquakes: Earthquake[]) => {
  if (earthquakes.length < 5)
    return [
      { name: "Jan", magnitudes: 4.2 },
      { name: "Feb", magnitudes: 5.1 },
      { name: "Mar", magnitudes: 4.8 },
      { name: "Apr", magnitudes: 6.2 },
      { name: "Mei", magnitudes: 3.5 },
      { name: "Jun", magnitudes: 5.4 },
    ];
  return earthquakes
    .slice(0, 10)
    .reverse()
    .map((eq) => ({
      name: new Date(eq.time).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      magnitudes: eq.magnitude,
    }));
};

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

function getStatusWilayah(earthquakes: Earthquake[]): {
  status: string;
  color: string;
} {
  if (earthquakes.length === 0)
    return { status: "Aman", color: "text-green-600" };
  const latest = earthquakes[0];
  if (!latest || !latest.magnitude)
    return { status: "Aman", color: "text-green-600" };
  if (latest.magnitude >= 6) return { status: "Bahaya", color: "text-red-600" };
  if (latest.magnitude >= 5)
    return { status: "Waspada", color: "text-orange-600" };
  return { status: "Siaga", color: "text-yellow-600" };
}

function isWithinBantul(lat: number, lng: number): boolean {
  return lat >= -8.05 && lat <= -7.75 && lng >= 110.15 && lng <= 110.55;
}

// --- Main Component ---
export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  // Data State
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
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
  const [calculatedRoute, setCalculatedRoute] = useState<any>(null);
  const [nearestShelters, setNearestShelters] = useState<
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
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [flyToLocation, setFlyToLocation] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClear = () => setSelectedEarthquake(null);
    window.addEventListener("clearEarthquakeSelection", handleClear);
    return () => window.removeEventListener("clearEarthquakeSelection", handleClear);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        sheltersData,
        hazardData,
        earthquakesResponse,
        facilitiesData,
        roadNetworkData,
      ] = await Promise.all([
        shelterApi.getAll().catch(() => []),
        hazardZoneApi.getAll().catch(() => []),
        earthquakeApi
          .getAll({ limit: 100 })
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
      setShelters(sheltersData as Shelter[]);
      setHazardZones(hazardData as HazardZone[]);
      setEarthquakes((earthquakesResponse as any).data as Earthquake[]);
      setFacilities(facilitiesData as PublicFacility[]);
      setRoadNetwork(roadNetworkData);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socketService.connect();

    const unsubscribeEarthquake = socketService.onNewEarthquake((newEq) => {
      const isInsideBantul = isWithinBantul(newEq.lat, newEq.lon);

      if (isInsideBantul) {
        // Gempa di dalam wilayah Bantul → tampilkan dengan tombol rute evakuasi
        toast.error(`🚨 Gempa M${newEq.magnitude} di ${newEq.location}`, {
          description: `Kedalaman: ${newEq.depth} km · Dalam wilayah Bantul`,
          duration: 10000,
          action: {
            label: "Lihat Rute",
            onClick: () => (window.location.href = "/?emergency=true"),
          },
        });
      } else {
        // Gempa di luar wilayah Bantul → hanya info + fly to lokasi
        toast.warning(`Terjadi gempa di ${newEq.location}`, {
          description: `M${newEq.magnitude} · Kedalaman: ${newEq.depth} km · Di luar wilayah Bantul`,
          duration: 10000,
          action: {
            label: "Lihat di Peta",
            onClick: () => {
              setFlyToLocation({ lat: newEq.lat, lon: newEq.lon, zoom: 11 });
              setSelectedEarthquake(newEq);
            },
          },
        });
      }

      setEarthquakes((prev) => [newEq, ...prev.slice(0, 99)]);
    });

    return () => {
      unsubscribeEarthquake();
      socketService.disconnect();
    };
  }, []);

  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
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
    if (shelters.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("emergency") === "true") {
        // Remove param from URL to prevent re-triggering on refresh
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );

        toast.info("Mencari rute evakuasi darurat...");

        if (!navigator.geolocation) {
          toast.error("Geolocation tidak didukung oleh browser ini.");
          return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            if (!isWithinBantul(userLat, userLng)) {
              toast.error(
                "Maaf, lokasi Anda di luar wilayah Kabupaten Bantul.",
              );
              setGettingLocation(false);
              return;
            }

            // 1. Find shelters with available capacity
            let availableShelters = shelters.filter(
              (s) => s.capacity - (s.currentOccupancy ?? 0) > 0,
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
            handleLocationSelect(userLat, userLng);
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
              toast.success(
                `Rute darurat ke ${nearestShelter.name} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
              );
            } catch (error) {
              console.error("Error calculating emergency route:", error);
              toast.error(
                "Gagal menghitung rute darurat dari lokasi saat ini.",
              );
            } finally {
              setGettingLocation(false);
            }
          },
          (error) => {
            console.error(error);
            toast.error("Gagal mendapatkan lokasi GPS Anda untuk evakuasi.");
            setGettingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 10000 },
        );
      }
    }
  }, [shelters, handleLocationSelect]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser Anda");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!isWithinBantul(latitude, longitude)) {
          toast.error(
            "Maaf, lokasi GPS Anda di luar batas wilayah Kabupaten Bantul.",
          );
          setGettingLocation(false);
          return;
        }
        handleLocationSelect(latitude, longitude);
        toast.success("Lokasi Anda berhasil didapatkan");
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error(
          "Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin lokasi diberikan.",
        );
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleToggleRoutingMode = () => {
    setRoutingMode(!routingMode);
    setRouteStart(null);
    setRouteEnd(null);
    setCalculatedRoute(null);
    if (!routingMode)
      toast.info("Mode Routing: Klik peta untuk pilih titik awal dan tujuan");
  };

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

      setTimeout(async () => {
        try {
          const route = await roadApi.calculateRoute(
            routeStart.lat,
            routeStart.lng,
            lat,
            lng,
          );
          setCalculatedRoute(route);
          toast.success(
            `Rute ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error("Error calculating route:", error);
          toast.error("Gagal menghitung rute. Coba titik lain.");
          setRouteEnd(null);
        }
      }, 100);
    } else if (!routeStart && routeEnd) {
      setRouteStart({ lat, lng });
      setSelectedLocation({ lat, lng });
      toast.success("Titik awal dipilih. Menghitung rute evakuasi...");

      setTimeout(async () => {
        try {
          const route = await roadApi.calculateRoute(
            lat,
            lng,
            routeEnd.lat,
            routeEnd.lng,
          );
          setCalculatedRoute(route);
          toast.success(
            `Rute ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error("Error calculating route:", error);
          toast.error("Gagal menghitung rute. Coba titik lain.");
          setRouteStart(null);
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
    if (routingMode) {
      if (routeStart) {
        setCalculatingRoute(true);
        toast.info("Menghitung rute dari titik awal terpilih...");
        try {
          const route = await roadApi.calculateRoute(
            routeStart.lat,
            routeStart.lng,
            shelterLat,
            shelterLng,
          );
          setCalculatedRoute(route);
          setRouteEnd({ lat: shelterLat, lng: shelterLng });
          toast.success(
            `Rute ke ${shelterName} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
          );
        } catch (error) {
          console.error("Error calculating route:", error);
          toast.error(
            "Gagal menghitung rute. Pastikan titik awal terhubung dengan jalan.",
          );
        } finally {
          setCalculatingRoute(false);
        }
      } else {
        setRouteEnd({ lat: shelterLat, lng: shelterLng });
        toast.info(
          `Tujuan di set ke ${shelterName}. Klik pada peta untuk memilih titik awal evakuasi Anda.`,
        );
      }
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser ini");
      return;
    }
    toast.info("Mendapatkan lokasi Anda...");
    setCalculatingRoute(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        if (!isWithinBantul(userLat, userLng)) {
          toast.error(
            "Maaf, lokasi GPS Anda di luar batas wilayah Kabupaten Bantul.",
          );
          setCalculatingRoute(false);
          return;
        }
        try {
          toast.info("Menghitung rute terpendek...");
          const route = await roadApi.calculateRoute(
            userLat,
            userLng,
            shelterLat,
            shelterLng,
          );
          setCalculatedRoute(route);
          setRouteStart({ lat: userLat, lng: userLng });
          setRouteEnd({ lat: shelterLat, lng: shelterLng });
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

  const chartData = generateChartData(earthquakes);
  const isDark = mounted && theme === "dark";
  const wilayahStatus = getStatusWilayah(earthquakes);

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-gray-50 flex items-center gap-2">
            SIGMA Bantul
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-gray-300 bg-white dark:bg-gray-900 px-4 py-2 rounded-full border border-slate-200 dark:border-gray-800 shadow-sm">
          <span>
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Overlay Backdrop when Map is Expanded */}
      {isMapExpanded && (
        <div
          className="fixed inset-0 z-[90] bg-slate-900/40 dark:bg-gray-950/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMapExpanded(false)}
        />
      )}

      {/* Main Map Fullscreen/Expanded Container */}
      <div
        className={
          isMapExpanded
            ? "fixed inset-4 md:inset-6 lg:inset-8 z-[100] rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-gray-700 shadow-2xl bg-slate-100 dark:bg-gray-900 transition-all duration-300"
            : "relative w-full h-[55vh] min-h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 shadow-sm bg-slate-100 dark:bg-gray-900 transition-all duration-300 flex flex-col"
        }
      >
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {/* Layer Sheet Toggle */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-gray-800 shadow-lg bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors h-10 w-10">
              <Layers className="h-5 w-5 text-slate-700 dark:text-gray-300" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[380px] p-0 bg-slate-50 dark:bg-gray-950 border-l border-slate-200 dark:border-gray-800 z-[1001]"
            >
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-slate-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <h1 className="text-lg font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                  <Layers className="h-5 w-5" /> Layer & Info
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
                    <h2 className="text-sm font-bold text-slate-900 dark:text-gray-100 border-b border-slate-200 dark:border-gray-800 pb-2">
                      Lokasi Terpilih
                    </h2>
                    <Card className="bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 shadow-sm">
                      <CardContent className="pt-4 pb-4">
                        <div className="font-mono text-xs font-semibold bg-slate-100 dark:bg-gray-950 p-2 rounded">
                          {selectedLocation.lat.toFixed(6)},{" "}
                          {selectedLocation.lng.toFixed(6)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {/* Nearest Shelter Module */}
                {nearestShelters.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-gray-100 border-b border-slate-200 dark:border-gray-800 pb-2">
                      Shelter Terdekat
                    </h2>
                    <div className="space-y-2">
                      {nearestShelters.map((shelter, i) => (
                        <Card
                          key={shelter.id}
                          className={`bg-white dark:bg-gray-900 shadow-sm cursor-pointer transition-colors ${expandedShelterId === shelter.id ? "border-primary ring-1 ring-primary" : "border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700"}`}
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
                                <p className="font-semibold text-slate-800 dark:text-gray-200">
                                  {shelter.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {shelter.distance.toFixed(2)} km
                                </p>
                              </div>
                              <Badge variant="outline" className="shrink-0">
                                #{i + 1}
                              </Badge>
                            </div>

                            {expandedShelterId === shelter.id && (
                              <div className="mt-2 pt-3 border-t border-slate-100 dark:border-gray-800/60 animate-in fade-in slide-in-from-top-2 flex flex-col gap-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                      Kondisi
                                    </p>
                                    <p className="text-xs font-medium text-slate-700 dark:text-gray-300">
                                      {shelter.condition}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                      Kapasitas
                                    </p>
                                    <p className="text-xs font-medium text-slate-700 dark:text-gray-300">
                                      {shelter.capacity} Orang
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                                    Alamat
                                  </p>
                                  <p
                                    className="text-xs font-medium text-slate-700 dark:text-gray-300 line-clamp-2"
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
                      ))}
                    </div>
                  </div>
                )}
                {/* Hazard Zones */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-gray-100 border-b border-slate-200 dark:border-gray-800 pb-2">
                    Zona Rawan
                  </h2>
                  <Card className="bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 shadow-sm">
                    <CardContent className="pt-4 pb-4 space-y-2">
                      {hazardZones.slice(0, 4).map((zone) => (
                        <div
                          key={zone.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-slate-700 dark:text-gray-300 truncate">
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
              setTimeout(() => window.dispatchEvent(new Event("resize")), 350);
            }}
            variant="outline"
            size="icon"
            className="h-10 w-10 shadow-lg bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800 group"
            title={isMapExpanded ? "Perkecil Peta" : "Perbesar Peta"}
          >
            {isMapExpanded ? (
              <Minimize2 className="w-5 h-5 text-slate-700 dark:text-gray-300 group-hover:scale-95 transition-transform" />
            ) : (
              <Maximize2 className="w-5 h-5 text-slate-700 dark:text-gray-300 group-hover:scale-105 transition-transform" />
            )}
          </Button>
        </div>

        {/* GPS Location Button */}
        <Button
          onClick={handleGetCurrentLocation}
          disabled={gettingLocation}
          className="absolute bottom-24 right-4 z-[1000] h-12 w-12 shadow-lg bg-blue-600 hover:bg-blue-700 border-0 rounded-full transition-colors flex items-center justify-center"
          size="icon"
        >
          {gettingLocation ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Navigation className="h-5 w-5 text-white" />
          )}
        </Button>

        {/* Routing Mode Toggle Button */}
        <Button
          onClick={handleToggleRoutingMode}
          className={`absolute bottom-8 right-4 z-[1000] h-12 w-12 shadow-lg border-0 rounded-full transition-colors flex items-center justify-center ${
            routingMode
              ? "bg-green-600 hover:bg-green-700"
              : "bg-slate-800 dark:bg-gray-800 hover:bg-slate-900"
          }`}
          size="icon"
          title={routingMode ? "Mode Routing Aktif" : "Aktifkan Mode Routing"}
        >
          <MapPin className="h-5 w-5 text-white" />
        </Button>

        {/* Selected Earthquake Floating Detail */}
        {selectedEarthquake && (
          <div
            className="absolute top-40 right-4 z-[1000] w-[300px] md:w-[340px] shadow-2xl rounded-xl overflow-hidden"
            style={{
              background: "#030712",
              color: "#f1f5f9",
              fontFamily: "system-ui,sans-serif",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "12px 14px 10px",
                borderBottom: "1px solid #111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  background: "#7f1d1d",
                  color: "#f87171",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "999px",
                }}
              >
                Pusat Gempa Terpilih
              </span>
              <button
                onClick={handleCloseEarthquakeDetail}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "2px",
                  lineHeight: 1,
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Body */}
            <div style={{ padding: "12px 14px 14px" }}>
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  marginBottom: "12px",
                  lineHeight: 1.3,
                }}
              >
                {selectedEarthquake.location}
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "7px 8px",
                  background: "#111827",
                  borderRadius: "6px",
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    fontWeight: 500,
                  }}
                >
                  Magnitudo
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#f87171",
                  }}
                >
                  M {selectedEarthquake.magnitude}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "7px 8px",
                  background: "#111827",
                  borderRadius: "6px",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    fontWeight: 500,
                  }}
                >
                  Kedalaman
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>
                  {selectedEarthquake.depth} Km
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#6b7280" }}>
                {new Date(selectedEarthquake.time).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </p>
            </div>
          </div>
        )}

        {/* Routing Info Form/Floating Detail */}
        {calculatedRoute && (
          <Card className="absolute top-20 md:top-20 left-1/2 md:left-4 transform -translate-x-1/2 md:translate-x-0 z-[1000] w-[300px] shadow-xl bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-800 dark:text-gray-200">
                  Informasi Rute
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setCalculatedRoute(null);
                    setRouteStart(null);
                    setRouteEnd(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {(() => {
                const distKm = calculatedRoute.properties.totalDistance / 1000;
                const walkTime = (distKm / 5) * 60;
                const bikeTime = (distKm / 40) * 60;
                const carTime = (distKm / 30) * 60;
                return (
                  <>
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide">
                        Jarak Jangkauan
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {distKm.toFixed(2)} km
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2 block">
                        Estimasi Waktu Tempuh
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/10 rounded-lg p-2 border border-green-100 dark:border-green-900/30">
                          <Footprints className="w-5 h-5 mb-1.5 text-green-600 dark:text-green-500" />
                          <span className="font-bold text-sm text-green-700 dark:text-green-500">
                            {Math.ceil(walkTime)}
                            <span className="text-[10px] font-normal">'</span>
                          </span>
                          <span className="text-[9px] text-green-600 dark:text-green-600/80 font-medium tracking-wide">
                            Jalan
                          </span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-900/10 rounded-lg p-2 border border-orange-100 dark:border-orange-900/30">
                          <Bike className="w-5 h-5 mb-1.5 text-orange-600 dark:text-orange-500" />
                          <span className="font-bold text-sm text-orange-700 dark:text-orange-500">
                            {Math.ceil(bikeTime)}
                            <span className="text-[10px] font-normal">'</span>
                          </span>
                          <span className="text-[9px] text-orange-600 dark:text-orange-600/80 font-medium tracking-wide">
                            Motor
                          </span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-900/10 rounded-lg p-2 border border-indigo-100 dark:border-indigo-900/30">
                          <Car className="w-5 h-5 mb-1.5 text-indigo-600 dark:text-indigo-500" />
                          <span className="font-bold text-sm text-indigo-700 dark:text-indigo-500">
                            {Math.ceil(carTime)}
                            <span className="text-[10px] font-normal">'</span>
                          </span>
                          <span className="text-[9px] text-indigo-600 dark:text-indigo-600/80 font-medium tracking-wide">
                            Mobil
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Selected Location Floating Detail */}
        {selectedLocation && !routingMode && !calculatedRoute && (
          <Card className="absolute top-20 md:top-20 left-1/2 md:left-4 transform -translate-x-1/2 md:translate-x-0 z-[1000] w-[300px] shadow-xl bg-white dark:bg-gray-950 border-slate-200 dark:border-gray-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-gray-200 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" /> Lokasi Titik
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setSelectedLocation(null);
                    setNearestShelters([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <div className="font-mono text-xs font-semibold bg-slate-50 dark:bg-gray-900 p-2 rounded text-slate-700 dark:text-gray-300">
                {selectedLocation.lat.toFixed(6)},{" "}
                {selectedLocation.lng.toFixed(6)}
              </div>
              {nearestShelters.length > 0 && (
                <div className="text-xs text-slate-600 dark:text-gray-400">
                  Ada{" "}
                  <span className="font-medium text-slate-800 dark:text-gray-200">
                    {nearestShelters.length} shelter terdekat
                  </span>{" "}
                  dari titik. <br />
                  Buka profil Layer di kanan atas u/ info detail.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="relative h-full w-full dark-map-container flex-1">
          <MapClient
            earthquakes={earthquakes}
            shelters={shelters}
            hazardZones={hazardZones}
            facilities={facilities}
            selectedLocation={selectedLocation}
            onLocationSelect={handleMapClick}
            onEarthquakeClick={handleEarthquakeClick}
            onCalculateRoute={calculateRouteToShelter}
            roadNetwork={roadNetwork}
            calculatedRoute={calculatedRoute}
            selectedEarthquake={selectedEarthquake}
            flyToLocation={flyToLocation}
          />
        </div>
      </div>

      {/* DASHBOARD WIDGETS BELOW (Visible by scrolling down) */}
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-gray-50 pt-4">
        Dashboard Analitik
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Widget */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-gray-800/50 bg-white dark:bg-gray-950/80 shadow-sm flex flex-col pt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">
              Magnitudo Gempa (10 Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px] pt-4 pr-6">
            <ResponsiveContainer width="100%" height={250} minWidth={0}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "#27272a" : "#e2e8f0"}
                />
                <XAxis
                  dataKey="name"
                  stroke={isDark ? "#71717a" : "#64748b"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={isDark ? "#71717a" : "#64748b"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `M${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#18181b" : "#ffffff",
                    borderColor: isDark ? "#27272a" : "#e2e8f0",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: isDark ? "#e4e4e7" : "#0f172a" }}
                />
                <Line
                  type="monotone"
                  dataKey="magnitudes"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* List Widget */}
        <Card className="border border-slate-200 dark:border-gray-800/50 bg-white dark:bg-gray-950/80 shadow-sm flex flex-col pt-2">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-gray-800/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-gray-200">
                Peringatan Dini
              </CardTitle>
              <Badge
                variant="outline"
                className="dark:text-gray-400 dark:border-gray-700 bg-slate-50 dark:bg-gray-900"
              >
                Total: {earthquakes.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[290px]">
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-gray-800/50">
              {earthquakes.length === 0 ? (
                <div className="p-4 flex items-center justify-center text-slate-500 h-[100px]">
                  Tidak ada data.
                </div>
              ) : (
                earthquakes.slice(0, 5).map((eq, i) => (
                  <div
                    key={`eq-${eq.id}-${i}`}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer"
                    onClick={() => handleEarthquakeClick(eq)}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-gray-200">
                        {(eq.location || "Lokasi tidak tersedia").slice(0, 35)}
                        {(eq.location || "").length > 35 ? "..." : ""}
                      </span>
                      <Badge
                        className={
                          (eq.magnitude || 0) >= 6
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                            : (eq.magnitude || 0) >= 5
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20"
                        }
                      >
                        {(eq.magnitude || 0) >= 6
                          ? "Bahaya"
                          : (eq.magnitude || 0) >= 5
                            ? "Waspada"
                            : "Siaga"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                          Magnitudo
                        </span>
                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                          M {eq.magnitude ?? "-"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                          Waktu Waktu
                        </span>
                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                          {eq.time
                            ? new Date(eq.time).toLocaleDateString("id-ID", {
                                month: "short",
                                day: "numeric",
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8">
        <Card className="border border-slate-200 dark:border-gray-800/50 bg-white dark:bg-gray-950/80 shadow-sm col-span-1 lg:col-span-2 pt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-gray-200">
              Overview Status Wilayah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mt-2 mb-4">
              <div className="flex-1 h-6 rounded-full overflow-hidden flex ring-1 ring-slate-200 dark:ring-gray-800">
                <div className="bg-green-500 w-[55%]" title="Aman"></div>
                <div className="bg-yellow-400 w-[20%]" title="Waspada"></div>
                <div className="bg-orange-500 w-[15%]" title="Siaga"></div>
                <div className="bg-red-500 w-[10%]" title="Bahaya"></div>
              </div>
            </div>
            <div className="flex gap-4 text-xs font-medium text-slate-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Aman
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />{" "}
                Waspada
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Siaga
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Bahaya
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-gray-800/50 bg-white dark:bg-gray-950/80 shadow-sm flex items-center p-6 gap-6 relative overflow-hidden">
          <div className="flex items-center justify-center">
            <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 drop-shadow-sm">
              +{shelters.length}
            </div>
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-lg font-bold text-slate-800 dark:text-gray-100">
              Shelter Aktif
            </span>
            <span className="text-xs text-slate-500">Titik tersedia</span>
          </div>
        </Card>

        <Card className="border border-slate-200 dark:border-gray-800/50 bg-white dark:bg-gray-950/80 shadow-sm flex items-center p-6 gap-6 relative overflow-hidden">
          <div className="flex items-center justify-center">
            <div className="text-5xl font-bold text-amber-600 dark:text-amber-400 drop-shadow-sm">
              {wilayahStatus.status}
            </div>
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-lg font-bold text-slate-800 dark:text-gray-100">
              Status Saat Ini
            </span>
            <span className="text-xs text-slate-500">
              Berdasarkan data rilis
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
