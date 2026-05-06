"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  earthquakeApi,
  shelterApi,
  hazardZoneApi,
  evacuationApi,
  publicFacilityApi,
  roadApi,
} from "@/api";
import { socketService } from "@/lib/socket";
import { toast } from "sonner";
import type {
  Shelter,
  HazardZone,
  Earthquake,
  EvacuationRoute,
  PublicFacility,
} from "@/types";
import {
  Loader2,
  Layers,
  AlertTriangle,
  Home,
  MapPin,
  Building,
  Navigation,
  X,
  Activity,
} from "lucide-react";

const MapClient = dynamic(
  () => import("@/components/map/map-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

// --- Constants ---
// Bantul center coordinates (approximate)
const BANTUL_LAT = -7.8878;
const BANTUL_LON = 110.3289;

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
  if (earthquakes.length === 0) {
    return { status: "Aman", color: "text-green-600" };
  }
  const latest = earthquakes[0];
  if (!latest || !latest.magnitude) {
    return { status: "Aman", color: "text-green-600" };
  }
  if (latest.magnitude >= 6) {
    return { status: "Bahaya", color: "text-red-600" };
  }
  if (latest.magnitude >= 5) {
    return { status: "Waspada", color: "text-orange-600" };
  }
  return { status: "Siaga", color: "text-yellow-600" };
}

function isWithinBantul(lat: number, lng: number): boolean {
  // Bounding box yang lebih akurat untuk Kabupaten Bantul
  return lat >= -8.15 && lat <= -7.88 && lng >= 110.2 && lng <= 110.5;
}

// Calculate impact radius based on magnitude
function calculateImpactRadius(magnitude: number): number {
  // Formula: R = Magnitude^2.5 * 1.5 km
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

export default function MapPage() {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([]);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
  const [roadNetwork, setRoadNetwork] = useState<any>(null);
  const [calculatedRoute, setCalculatedRoute] = useState<any>(null);
  const [nearestShelters, setNearestShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleCloseEarthquakeDetail = () => {
    setSelectedEarthquake(null);
    // Trigger event to hide radius circle
    window.dispatchEvent(new CustomEvent("hideEarthquakeRadius"));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser Anda");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationSelect(latitude, longitude);
        // Also set as route start for manual route calculation
        setRouteStart({ lat: latitude, lng: longitude });
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
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleCalculateRoute = async () => {
    if (!routeStart || !routeEnd) {
      toast.error("Pilih titik awal dan tujuan terlebih dahulu");
      return;
    }

    setCalculatingRoute(true);
    try {
      const route = await roadApi.calculateRoute(
        routeStart.lat,
        routeStart.lng,
        routeEnd.lat,
        routeEnd.lng,
      );
      setCalculatedRoute(route);
      toast.success(
        `Rute ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km`,
      );
    } catch (error) {
      console.error("Error calculating route:", error);
      toast.error(
        "Gagal menghitung rute. Pastikan kedua titik terhubung oleh jalan.",
      );
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleToggleRoutingMode = () => {
    setRoutingMode(!routingMode);
    setRouteStart(null);
    setRouteEnd(null);
    setCalculatedRoute(null);
    if (!routingMode) {
      toast.info("Mode Routing: Klik peta untuk pilih titik awal dan tujuan");
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!routingMode) {
      handleLocationSelect(lat, lng);
      // Also set as route start for manual route calculation
      setRouteStart({ lat, lng });
      return;
    }

    // Routing mode: set start and end points
    if (!routeStart) {
      setRouteStart({ lat, lng });
      toast.success("Titik awal dipilih. Klik lagi untuk titik tujuan.");
    } else if (!routeEnd) {
      setRouteEnd({ lat, lng });
      toast.success("Titik tujuan dipilih. Menghitung rute...");
      setCalculatingRoute(true);
      // Auto calculate route
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
        } finally {
          setCalculatingRoute(false);
        }
      }, 100);
    } else {
      // Reset and start over
      setRouteStart({ lat, lng });
      setRouteEnd(null);
      setCalculatedRoute(null);
      toast.info("Titik awal baru dipilih. Klik lagi untuk titik tujuan.");
    }
  };

  // Function to calculate route to shelter (called from popup)
  const calculateRouteToShelter = async (
    shelterLat: number,
    shelterLng: number,
    shelterName: string,
  ) => {
    console.log("calculateRouteToShelter called with:", {
      shelterLat,
      shelterLng,
      shelterName,
    });

    // Get current location first
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser ini");
      return;
    }

    toast.info("Mendapatkan lokasi Anda...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        console.log("User location:", { userLat, userLng });

        try {
          setCalculatingRoute(true);
          toast.info("Menghitung rute terpendek...");
          const route = await roadApi.calculateRoute(
            userLat,
            userLng,
            shelterLat,
            shelterLng,
          );

          console.log("Route calculated:", route);
          setCalculatedRoute(route);
          setRouteStart({ lat: userLat, lng: userLng });
          setRouteEnd({ lat: shelterLat, lng: shelterLng });

          toast.success(
            `Rute ke ${shelterName} ditemukan! Jarak: ${(route.properties.totalDistance / 1000).toFixed(2)} km, Waktu: ${route.properties.totalTime.toFixed(1)} menit`,
          );
        } catch (error) {
          console.error("Error calculating route:", error);
          toast.error(
            "Gagal menghitung rute. Pastikan lokasi Anda terhubung dengan jalan.",
          );
        } finally {
          setCalculatingRoute(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error(
          "Gagal mendapatkan lokasi Anda. Pastikan GPS aktif dan izin lokasi diberikan.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const handleEarthquakeClick = (earthquake: Earthquake) => {
    // Don't trigger map click when clicking earthquake
    setSelectedEarthquake(earthquake);
  };

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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        sheltersData,
        hazardData,
        earthquakesResponse,
        routesData,
        facilitiesData,
        roadNetworkData,
      ] = await Promise.all([
        shelterApi.getAll().catch(() => []),
        hazardZoneApi.getAll().catch(() => []),
        earthquakeApi
          .getAll({ limit: 100 })
          .catch(() => ({ data: [], total: 0, page: 1, limit: 100 })),
        evacuationApi.getRecommendedRoutes({ limit: 20 }).catch(() => []),
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
      setEarthquakes(earthquakesResponse.data as Earthquake[]);
      setRoutes(routesData as EvacuationRoute[]);
      setFacilities(facilitiesData as PublicFacility[]);
      setRoadNetwork(roadNetworkData);
    } catch (err) {
      setError("Gagal memuat data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socketService.connect();

    const unsubscribeEarthquake = socketService.onNewEarthquake(
      (newEarthquake) => {
        const isInsideBantul = isWithinBantul(
          newEarthquake.lat,
          newEarthquake.lon,
        );
        const distance = calculateDistance(
          newEarthquake.lat,
          newEarthquake.lon,
          BANTUL_LAT,
          BANTUL_LON,
        );

        // Check if user location is threatened (if available)
        let userThreatened = false;
        if (selectedLocation) {
          userThreatened = isThreatened(
            selectedLocation.lat,
            selectedLocation.lng,
            newEarthquake.lat,
            newEarthquake.lon,
            newEarthquake.magnitude,
          );
        }

        // Determine threat level
        const shouldTriggerEmergency = isInsideBantul || userThreatened;

        if (shouldTriggerEmergency) {
          // High threat - show error toast with emergency action
          const locationDesc = isInsideBantul
            ? "Dalam wilayah Bantul"
            : `Jarak ${distance.toFixed(1)}km dari Bantul`;

          toast.error(
            `Gempa M${newEarthquake.magnitude} di ${newEarthquake.location}`,
            {
              icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
              description: `Kedalaman: ${newEarthquake.depth} km · ${locationDesc}`,
              duration: 10000,
              action: {
                label: "Lihat Rute Evakuasi",
                onClick: () =>
                  (window.location.href = "/evacuation?emergency=true"),
              },
            },
          );
        } else {
          // Low threat - show warning toast with map view
          toast.warning(`Terjadi gempa di ${newEarthquake.location}`, {
            description: `M${newEarthquake.magnitude} · Kedalaman: ${newEarthquake.depth} km · ${distance.toFixed(1)}km dari Bantul`,
            duration: 10000,
            action: {
              label: "Lihat di Peta",
              onClick: () => {
                setSelectedEarthquake(newEarthquake);
              },
            },
          });
        }

        setEarthquakes((prev) => [newEarthquake, ...prev.slice(0, 9)]);
      },
    );

    const unsubscribeRoute = socketService.onRouteUpdate(() => {
      toast.info("Jalur evakuasi telah diperbarui");
      fetchData();
    });

    return () => {
      unsubscribeEarthquake();
      unsubscribeRoute();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClear = () => setSelectedEarthquake(null);
    window.addEventListener("clearEarthquakeSelection", handleClear);
    return () =>
      window.removeEventListener("clearEarthquakeSelection", handleClear);
  }, []);

  const wilayahStatus = getStatusWilayah(earthquakes);

  return (
    <div className="flex w-full h-[calc(100vh-1rem)] md:h-full">
      <div className="flex-1 relative">
        {/* Loading Indicator Overlay */}
        {(calculatingRoute || gettingLocation) && (
          <div className="absolute inset-0 z-[2000] bg-white/40 dark:bg-black/60 backdrop-blur-[4px] flex flex-col items-center justify-center rounded-xl transition-all duration-300">
            <div className="bg-white/95 dark:bg-slate-900/95 px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-500" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {gettingLocation ? "Mencari Lokasi Anda" : "Menghitung Rute"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {gettingLocation
                    ? "Sedang melacak posisi GPS..."
                    : "Mencari jalur tercepat dan teraman..."}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="relative w-full h-full">
          {loading && (
            <div className="absolute inset-0 z-[2000] bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
              <p className="text-zinc-300 font-medium">Memuat data peta...</p>
              <p className="text-zinc-500 text-sm mt-2">
                Mengambil data shelter, gempa, dan zona rawan
              </p>
            </div>
          )}
          <MapClient
            shelters={shelters}
            hazardZones={hazardZones}
            earthquakes={earthquakes}
            facilities={facilities}
            selectedLocation={selectedLocation}
            onLocationSelect={handleMapClick}
            onEarthquakeClick={handleEarthquakeClick}
            onCalculateRoute={calculateRouteToShelter}
            roadNetwork={roadNetwork}
            calculatedRoute={calculatedRoute}
          />
        </div>

        {/* Earthquake Detail Card - Top Right */}
        {selectedEarthquake && (
          <Card className="absolute top-4 right-20 z-[1000] w-[360px] shadow-xl bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Terkonfirmasi
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCloseEarthquakeDetail}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Time */}
              <div className="text-sm text-slate-600">
                {new Date(selectedEarthquake.time).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
                ,{" "}
                {new Date(selectedEarthquake.time).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </div>

              {/* Location */}
              <h3 className="text-xl font-bold text-slate-900">
                {selectedEarthquake.location}
              </h3>

              {/* Details Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-600" />
                    <span className="text-sm text-slate-600">Magnitudo:</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    {selectedEarthquake.magnitude}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-green-600"></div>
                    </div>
                    <span className="text-sm text-slate-600">Kedalaman:</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    {selectedEarthquake.depth} Km
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-600" />
                    <span className="text-sm text-slate-600">Lokasi:</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {selectedEarthquake.lat.toFixed(2)} LS -{" "}
                    {selectedEarthquake.lon.toFixed(2)} BT
                  </span>
                </div>
              </div>

              {/* Detail Button */}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Lihat Detail
              </Button>
            </CardContent>
          </Card>
        )}

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
          className={`absolute bottom-10 right-4 z-[1000] h-12 w-12 shadow-lg border-0 rounded-full transition-colors flex items-center justify-center ${
            routingMode
              ? "bg-green-600 hover:bg-green-700"
              : "bg-slate-600 hover:bg-slate-700"
          }`}
          size="icon"
          title={routingMode ? "Mode Routing Aktif" : "Aktifkan Mode Routing"}
        >
          <MapPin className="h-5 w-5 text-white" />
        </Button>

        {/* Route Info Card */}
        {calculatedRoute && (
          <Card className="absolute top-20 right-4 z-[1000] w-[300px] shadow-xl bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Informasi Rute</CardTitle>
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
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-slate-600">Jarak Total:</span>
                <span className="text-lg font-bold text-blue-600">
                  {(calculatedRoute.properties.totalDistance / 1000).toFixed(2)}{" "}
                  km
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-slate-600">Waktu Tempuh:</span>
                <span className="text-lg font-bold text-green-600">
                  {calculatedRoute.properties.totalTime.toFixed(0)} menit
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Jumlah Segmen:</span>
                <span className="text-lg font-bold text-slate-900">
                  {calculatedRoute.properties.segments} jalan
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4 z-[1000] h-12 w-12 shadow-lg bg-white hover:bg-slate-50 border-slate-200 rounded-lg transition-colors flex items-center justify-center"
            />
          }
        >
          <Layers className="h-5 w-5 text-slate-700" />
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[380px] p-0 bg-slate-50 border-l border-slate-200"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Layers className="h-5 w-5 text-slate-700" />
                </div>
                <h1 className="text-lg font-bold text-slate-900">
                  Layers &amp; Info
                </h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-slate-100"
                onClick={() => setSheetOpen(false)}
              >
                <X className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(100vh-5rem)]">
            <div className="space-y-4 p-5">
              <div>
                <h2 className="text-lg font-semibold mb-4">Informasi</h2>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                ) : error ? (
                  <Card className="border-destructive bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-destructive font-medium">
                            {error}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={fetchData}
                          >
                            Coba Lagi
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {/* Status Wilayah */}
                    {earthquakes.length > 0 && (
                      <Card className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <div className="p-1.5 bg-red-50 rounded">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                            <span>Riwayat Gempa</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-red-600">
                                {earthquakes.length}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Kejadian
                              </span>
                            </div>
                            {earthquakes[0]?.magnitude &&
                              earthquakes[0]?.location && (
                                <div className="text-xs text-muted-foreground pt-2 border-t">
                                  Gempa terbaru: M{earthquakes[0].magnitude} -{" "}
                                  {earthquakes[0].location}
                                </div>
                              )}
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t mt-2 italic text-center leading-tight">
                              Sumber data gempa pada sistem ini berasal dari
                              BMKG (Badan Meteorologi, Klimatologi, dan
                              Geofisika) melalui layanan Data Gempabumi Terbuka
                              BMKG.
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Status Wilayah Card */}
                    <Card className="border border-slate-200 shadow-sm bg-blue-50 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded">
                            <Navigation className="h-4 w-4 text-blue-600" />
                          </div>
                          <span>Status Wilayah</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge
                              variant={
                                wilayahStatus.status === "Aman"
                                  ? "default"
                                  : wilayahStatus.status === "Waspada"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className={`text-base px-3 py-1 ${wilayahStatus.color}`}
                            >
                              {wilayahStatus.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">
                              Berdasarkan gempa terbaru
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                            <Home className="h-3.5 w-3.5 text-green-600" />
                            Shelter
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-2xl font-bold text-slate-900">
                            {shelters.length}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            tersedia
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-orange-600" />
                            Fasilitas
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-2xl font-bold text-slate-900">
                            {facilities.length}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            tersedia
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Hazard Zones */}
                    <Card className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div className="p-1.5 bg-amber-50 rounded">
                            <MapPin className="h-4 w-4 text-amber-600" />
                          </div>
                          <span>Zona Rawan</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {hazardZones.slice(0, 4).map((zone) => (
                            <div
                              key={zone.id}
                              className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded transition-colors"
                            >
                              <span className="text-slate-700 font-medium truncate flex-1">
                                {zone.name}
                              </span>
                              <Badge
                                variant={
                                  zone.level === "CRITICAL"
                                    ? "destructive"
                                    : zone.level === "HIGH"
                                      ? "default"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {zone.level}
                              </Badge>
                            </div>
                          ))}
                          {hazardZones.length > 4 && (
                            <p className="text-xs text-muted-foreground pt-2 px-2 border-t">
                              +{hazardZones.length - 4} zona lainnya
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Lokasi Terpilih Section */}
              {selectedLocation && (
                <div className="border-t border-slate-200 pt-4">
                  <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-purple-50 rounded">
                      <MapPin className="h-4 w-4 text-purple-600" />
                    </div>
                    Lokasi Terpilih
                  </h2>
                  <Card className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="font-mono text-sm font-semibold text-slate-900 bg-slate-50 p-3 rounded border border-slate-200">
                        {selectedLocation.lat.toFixed(6)},{" "}
                        {selectedLocation.lng.toFixed(6)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Klik peta untuk memilih lokasi baru
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Shelter Terdekat Section */}
              {nearestShelters.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-green-50 rounded">
                      <Home className="h-4 w-4 text-green-600" />
                    </div>
                    Shelter Terdekat
                  </h2>
                  <div className="space-y-2">
                    {nearestShelters.map((shelter, index) => {
                      const coords = shelter.geometry as {
                        coordinates: [number, number];
                      };
                      const distance = calculateDistance(
                        selectedLocation!.lat,
                        selectedLocation!.lng,
                        coords.coordinates[1],
                        coords.coordinates[0],
                      );
                      return (
                        <Card
                          key={shelter.id}
                          className="border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow"
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {shelter.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Jarak:{" "}
                                  <span className="font-medium text-slate-700">
                                    {distance.toFixed(2)} km
                                  </span>
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="flex-shrink-0 bg-slate-50 text-slate-700 border-slate-200"
                              >
                                #{index + 1}
                              </Badge>
                            </div>
                            <Button
                              onClick={() => {
                                calculateRouteToShelter(
                                  coords.coordinates[1],
                                  coords.coordinates[0],
                                  shelter.name,
                                );
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                              size="sm"
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              Hitung Rute
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
