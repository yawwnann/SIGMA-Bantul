"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { evacuationApi, roadApi } from "@/api";
import type { Shelter } from "@/types";
import { Compass, MapPin, Navigation, Route, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const MapClient = dynamic(
  () => import("@/components/map/map-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-100 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    ),
  }
);

export default function EvacuationPage() {
  const [startLat, setStartLat] = useState("");
  const [startLon, setStartLon] = useState("");
  const [nearbyShelters, setNearbyShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedShelterId, setExpandedShelterId] = useState<number | null>(null);
  const [selectedRouteGeometry, setSelectedRouteGeometry] = useState<any>(null);


  const findNearestShelters = async (lat: string, lon: string) => {
    if (!lat || !lon) {
      setError("Harap isi koordinat lokasi Anda");
      return;
    }

    setCalculating(true);
    setError(null);
    try {
      const shelters = await evacuationApi.getNearestShelter(
        parseFloat(lat),
        parseFloat(lon),
        5,
      ) as Shelter[];
      
      setNearbyShelters(shelters);
      setExpandedShelterId(null);
      setSelectedRouteGeometry(null);

      if (!shelters || shelters.length === 0) {
        setError("Tidak dapat menemukan shelter di sekitar.");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat mencari shelter otomatis.");
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculateRouteForShelter = async (shelter: Shelter) => {
    if (expandedShelterId === shelter.id && selectedRouteGeometry) {
      // Toggle off
      setExpandedShelterId(null);
      setSelectedRouteGeometry(null);
      return;
    }

    setExpandedShelterId(shelter.id);
    setSelectedRouteGeometry(null); // Clear previous map while loading
    setCalculating(true);
    setError(null);
    try {
      const coords = shelter.geometry as { coordinates: [number, number] };
      const routeData = await roadApi.calculateRoute(
        parseFloat(startLat),
        parseFloat(startLon),
        coords.coordinates[1],
        coords.coordinates[0]
      );
      
      if (routeData) {
         setSelectedRouteGeometry(routeData);
      } else {
         setError("Rute menuju shelter ini tidak ditemukan.");
      }
    } catch (err) {
      setError("Gagal menghitung rute ke shelter.");
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  const handleManualCalculate = () => findNearestShelters(startLat, startLon);

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setCalculating(true); // show feedback sooner
      setError(null); // clear error
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toString();
          const lon = position.coords.longitude.toString();
          setStartLat(lat);
          setStartLon(lon);
          findNearestShelters(lat, lon);
        },
        (err) => {
          setError("Tidak dapat mendapatkan lokasi otomatis");
          setCalculating(false);
          console.error(err);
        },
      );
    } else {
      setError("Geolokasi tidak didukung oleh browser Anda");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
              Jalur Evakuasi
            </h1>
            <p className="text-slate-500 dark:text-zinc-400">
              Hitung dan lihat rekomendasi jalur evakuasi optimal berdasarkan
              kondisi
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                  <Navigation className="h-5 w-5 text-blue-600" />
                  Pencarian Rute Evakuasi Otomatis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startLat" className="text-slate-700 dark:text-zinc-300">Lintang Anda</Label>
                    <Input
                      id="startLat"
                      type="number"
                      step="any"
                      placeholder="-7.888"
                      value={startLat}
                      onChange={(e) => setStartLat(e.target.value)}
                      className="w-full border border-slate-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startLon" className="text-slate-700 dark:text-zinc-300">Bujur Anda</Label>
                    <Input
                      id="startLon"
                      type="number"
                      step="any"
                      placeholder="110.33"
                      value={startLon}
                      onChange={(e) => setStartLon(e.target.value)}
                      className="w-full border border-slate-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {error && <p className="text-sm font-medium text-red-500 dark:text-red-400">{error}</p>}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={useCurrentLocation}
                    disabled={calculating}
                    className="flex-1 min-w-[200px] border-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 hover:bg-slate-50 transition-colors"
                  >
                    <MapPin className="mr-2 h-4 w-4 text-green-500" />
                    Gunakan Lokasi Saya (Otomatis)
                  </Button>
                  <Button
                    onClick={handleManualCalculate}
                    disabled={calculating}
                    className="flex-1 min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    {calculating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4" />
                    )}
                    {calculating ? "Mencari rute..." : "Cari Shelter & Rute Terdekat"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Map Area */}
            {expandedShelterId && (
              <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-900/50">
                  <h3 className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <Route className="h-5 w-5 text-blue-500" />
                    Peta Rute ke Tujuan
                  </h3>
                </div>
                <div className="w-full h-[500px] relative bg-slate-100 dark:bg-zinc-950">
                  {calculating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
                      <p className="text-slate-500 dark:text-zinc-400 font-medium">
                        Mengkalkulasi Rute Optimal...
                      </p>
                    </div>
                  ) : selectedRouteGeometry ? (
                    <MapClient
                      shelters={nearbyShelters.filter(s => s.id === expandedShelterId)}
                      earthquakes={[]}
                      hazardZones={[]}
                      facilities={[]}
                      selectedLocation={startLat && startLon ? { lat: parseFloat(startLat), lng: parseFloat(startLon) } : null}
                      onLocationSelect={() => {}}
                      calculatedRoute={selectedRouteGeometry}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-slate-500 dark:text-zinc-400">
                        {error || "Rute tidak tersedia."}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-zinc-100">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Shelter Terdekat
                </CardTitle>
              </CardHeader>
            <CardContent>
                {nearbyShelters.length > 0 ? (
                  <div className="space-y-4">
                    {nearbyShelters.map((shelter) => (
                      <div
                        key={shelter.id}
                        className="flex flex-col border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden transition-all duration-200"
                      >
                        {/* Shelter Card Main Header */}
                        <div 
                          className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          onClick={() => {
                            if (expandedShelterId === shelter.id && selectedRouteGeometry) {
                                setExpandedShelterId(null);
                                setSelectedRouteGeometry(null);
                            } else {
                                setExpandedShelterId(shelter.id);
                            }
                          }}
                        >
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 text-lg">
                              {shelter.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  shelter.condition === "GOOD"
                                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                    : shelter.condition === "MODERATE"
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800"
                                      : shelter.condition === "NEEDS_REPAIR"
                                        ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                }`}
                              >
                                {shelter.condition}
                              </Badge>
                              <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 px-2.5 py-0.5 rounded-full">
                                Kapasitas: {shelter.capacity}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCalculateRouteForShelter(shelter);
                              }}
                              variant={expandedShelterId === shelter.id && selectedRouteGeometry ? "secondary" : "default"}
                              className={expandedShelterId === shelter.id && selectedRouteGeometry ? "bg-slate-100 dark:bg-zinc-800" : "bg-blue-600 hover:bg-blue-700"}
                            >
                              <Route className="w-4 h-4 mr-2" />
                              {expandedShelterId === shelter.id && selectedRouteGeometry ? "Tutup Rute" : "Lihat Rute"}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Content (Details & Map) */}
                        {expandedShelterId === shelter.id && (
                           <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/30 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">Alamat Lengkap</p>
                                  <p className="text-slate-900 dark:text-zinc-100">{shelter.address || "Belum ada detail alamat"}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500 font-medium mb-1">Fasilitas Tersedia</p>
                                  <p className="text-slate-900 dark:text-zinc-100">{shelter.facilities || "Data fasilitas belum dilengkapi"}</p>
                                </div>
                              </div>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 flex flex-col items-center">
                    <Navigation className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-3" />
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">
                      Silakan isi Koordinat Awal Anda. Sistem akan mencari shelter terdekat secara otomatis.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
