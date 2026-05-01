"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Maximize2,
  Minimize2,
  Activity,
  TrendingUp,
  TrendingDown,
  MapPin,
  Home,
  AlertTriangle,
  Clock,
  Layers,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const MapClient = dynamic(
  () => import("@/components/map/map-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    ),
  },
);

// --- Constants ---
// Bantul center coordinates (approximate)
const BANTUL_LAT = -7.8878;
const BANTUL_LON = 110.3289;

// --- Helper Functions ---
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

function isWithinBantul(lat: number, lng: number): boolean {
  return lat >= -8.05 && lat <= -7.75 && lng >= 110.15 && lng <= 110.55;
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

export default function DashboardPage() {
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
  const [loading, setLoading] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedEarthquake, setSelectedEarthquake] =
    useState<Earthquake | null>(null);
  const [routeStart, setRouteStart] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routeEnd, setRouteEnd] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
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

        setEarthquakes((prev) => [newEarthquake, ...prev.slice(0, 99)]);
      },
    );

    return () => {
      unsubscribeEarthquake();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClear = () => setSelectedEarthquake(null);
    window.addEventListener("clearEarthquakeSelection", handleClear);
    return () =>
      window.removeEventListener("clearEarthquakeSelection", handleClear);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setRouteStart({ lat, lng });
  };

  const handleEarthquakeClick = (earthquake: Earthquake) => {
    setSelectedEarthquake(earthquake);
  };

  const calculateRouteToShelter = async (
    shelterLat: number,
    shelterLng: number,
    shelterName: string,
  ) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser ini");
      return;
    }

    toast.info("Mendapatkan lokasi Anda...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        try {
          setCalculatingRoute(true);
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
          toast.error("Gagal menghitung rute.");
        } finally {
          setCalculatingRoute(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Gagal mendapatkan lokasi Anda.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  // Prepare chart data
  const chartData = earthquakes
    .slice(0, 30)
    .reverse()
    .map((eq, index) => ({
      name: new Date(eq.time).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      magnitude: eq.magnitude,
      depth: eq.depth,
    }));

  const magnitudeDistribution = [
    {
      range: "< 3.0",
      count: earthquakes.filter((eq) => eq.magnitude < 3).length,
    },
    {
      range: "3.0-4.0",
      count: earthquakes.filter((eq) => eq.magnitude >= 3 && eq.magnitude < 4)
        .length,
    },
    {
      range: "4.0-5.0",
      count: earthquakes.filter((eq) => eq.magnitude >= 4 && eq.magnitude < 5)
        .length,
    },
    {
      range: "5.0-6.0",
      count: earthquakes.filter((eq) => eq.magnitude >= 5 && eq.magnitude < 6)
        .length,
    },
    {
      range: "> 6.0",
      count: earthquakes.filter((eq) => eq.magnitude >= 6).length,
    },
  ];

  const latestEarthquake = earthquakes[0];
  const avgMagnitude =
    earthquakes.length > 0
      ? (
          earthquakes.reduce((sum, eq) => sum + eq.magnitude, 0) /
          earthquakes.length
        ).toFixed(2)
      : "0";

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "dark bg-slate-900" : "bg-slate-50"}`}
    >
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              Dashboard Monitoring
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Sistem Informasi Geografis Manajemen Krisis Gempa Bumi
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Live Clock */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 font-mono tracking-wider">
                  {currentTime.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-full"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div
            className={`${isMapExpanded ? "lg:col-span-3" : "lg:col-span-2"} transition-all duration-300`}
          >
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <Layers className="h-5 w-5" />
                  Peta Interaktif
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                  className="rounded-lg"
                >
                  {isMapExpanded ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  className={`${isMapExpanded ? "h-[calc(100vh-12rem)]" : "h-[500px]"} transition-all duration-300 relative`}
                >
                  {/* Loading Indicator Overlay */}
                  {calculatingRoute && (
                    <div className="absolute inset-0 z-[2000] bg-white/40 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-b-xl transition-all duration-300">
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
                  {loading && (
                    <div className="absolute inset-0 z-[2000] bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                      <p className="text-zinc-300 font-medium">
                        Memuat data peta...
                      </p>
                      <p className="text-zinc-500 text-sm mt-2">
                        Mengambil data shelter, gempa, dan zona rawan
                      </p>
                    </div>
                  )}
                  <MapClient
                    shelters={shelters}
                    hazardZones={hazardZones}
                    earthquakes={earthquakes}
                    routes={routes}
                    facilities={facilities}
                    selectedLocation={selectedLocation}
                    onLocationSelect={handleLocationSelect}
                    onEarthquakeClick={handleEarthquakeClick}
                    onCalculateRoute={calculateRouteToShelter}
                    roadNetwork={roadNetwork}
                    calculatedRoute={calculatedRoute}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats & Info Section */}
          {!isMapExpanded && (
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <Activity className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      {earthquakes.length}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Total Gempa
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      {shelters.length}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Shelter
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Latest Earthquake */}
              {latestEarthquake && (
                <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 dark:text-white">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Gempa Terbaru
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-red-600 dark:text-red-400">
                          M{latestEarthquake.magnitude}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          Terbaru
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{latestEarthquake.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(latestEarthquake.time).toLocaleString(
                              "id-ID",
                            )}
                          </span>
                        </div>
                        <div className="pt-2 border-t dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">
                            Kedalaman:{" "}
                            <strong className="text-slate-900 dark:text-white">
                              {latestEarthquake.depth} km
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Earthquakes List */}
              <Card className="border-0 shadow-lg dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm dark:text-white">
                    Riwayat Gempa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {earthquakes.slice(0, 10).map((eq) => (
                      <div
                        key={eq.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        onClick={() => handleEarthquakeClick(eq)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">
                              M{eq.magnitude}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {eq.depth}km
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {eq.location}
                          </p>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                          {new Date(eq.time).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t dark:border-slate-700">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic">
                      Sumber data gempa pada sistem ini berasal dari BMKG (Badan
                      Meteorologi, Klimatologi, dan Geofisika) melalui layanan
                      Data Gempabumi Terbuka BMKG.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Charts Section */}
        {!isMapExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Magnitude Trend */}
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-base dark:text-white">
                  Tren Magnitudo (30 Hari Terakhir)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorMagnitude"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDarkMode ? "#334155" : "#e2e8f0"}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="magnitude"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorMagnitude)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Magnitude Distribution */}
            <Card className="border-0 shadow-xl dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-base dark:text-white">
                  Distribusi Magnitudo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={magnitudeDistribution}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDarkMode ? "#334155" : "#e2e8f0"}
                    />
                    <XAxis
                      dataKey="range"
                      stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={isDarkMode ? "#94a3b8" : "#64748b"}
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
