"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { analysisApi, type FrequencyAnalysisResponse } from "@/api/analysis";
import { earthquakeApi } from "@/api";
import type { Earthquake } from "@/types";
import dynamic from "next/dynamic";
import {
  Activity,
  Filter,
  Layers,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  MapPin,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const FrequencyMap = dynamic(() => import("./components/frequency-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-950">
      <div className="text-center">
        <Layers className="h-12 w-12 text-slate-400 dark:text-zinc-600 mx-auto mb-2 animate-pulse" />
        <p className="text-sm text-slate-500 dark:text-zinc-500">
          Loading map...
        </p>
      </div>
    </div>
  ),
});

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FrequencyAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Earthquake history states
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [earthquakesLoading, setEarthquakesLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [gridSize, setGridSize] = useState<5 | 10 | 20>(5);
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [showBpbdLayer, setShowBpbdLayer] = useState(false);
  const [showEarthquakes, setShowEarthquakes] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analysisApi.getFrequencyAnalysis({
        start_date: `${startDate}T00:00:00Z`,
        end_date: `${endDate}T23:59:59Z`,
        grid_size: gridSize,
        min_magnitude: minMagnitude,
      });
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data analisis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    fetchEarthquakeHistory();
  }, []);

  const fetchEarthquakeHistory = async () => {
    setEarthquakesLoading(true);
    try {
      const response = await earthquakeApi.getAll({ limit: 100 });
      setEarthquakes(response.data);
    } catch (err) {
      console.error("Failed to fetch earthquake history:", err);
    } finally {
      setEarthquakesLoading(false);
    }
  };

  const chartData = earthquakes
    .slice(0, 30)
    .reverse()
    .map((eq) => ({
      time: new Date(eq.time).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      magnitude: eq.magnitude,
    }));

  const handleReset = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    setStartDate(date.toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);
    setGridSize(5);
    setMinMagnitude(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8">
      <div className="container mx-auto px-4 ">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
              Sebaran Gempa
            </h1>
          </div>
          <p className="text-slate-600 dark:text-zinc-400">
            Analisis spasial frekuensi kejadian gempa bumi berdasarkan data
            historis
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic mt-2">
            Sumber data gempa berasal dari BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) melalui layanan Data Gempabumi Terbuka BMKG.
          </p>
        </div>

        {/* Statistics Cards */}
        {data && !loading && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                      Total Gempa
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
                      {data.metadata.total_earthquakes}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                      Area Frekuensi Tinggi
                    </p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-500 mt-1">
                      {data.statistics.high_count}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                      Area Frekuensi Sedang
                    </p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-500 mt-1">
                      {data.statistics.medium_count}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                      Total Grid
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
                      {data.metadata.total_grids}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Earthquake History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart Widget */}
          <Card className="lg:col-span-2 border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-sm flex flex-col pt-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-zinc-200">
                Riwayat Magnitudo Gempa (30 Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[250px] pt-4 pr-6">
              {earthquakesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-full h-[200px]" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250} minWidth={0}>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#888888"
                      strokeOpacity={0.2}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `M${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        borderColor: "#27272a",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#e4e4e7" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="magnitude"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* List Widget */}
          <Card className="border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950/80 shadow-sm flex flex-col pt-2">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-zinc-200">
                  Gempa Terbaru
                </CardTitle>
                <Badge
                  variant="outline"
                  className="dark:text-zinc-400 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900"
                >
                  {earthquakes.length} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-auto max-h-[290px]">
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/50">
                {earthquakesLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : earthquakes.length === 0 ? (
                  <div className="p-4 flex items-center justify-center text-slate-500 dark:text-zinc-400 h-[100px]">
                    Tidak ada data gempa
                  </div>
                ) : (
                  earthquakes.slice(0, 5).map((eq, i) => (
                    <div
                      key={`eq-${eq.id}-${i}`}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-zinc-200 line-clamp-1">
                          {eq.location || "Lokasi tidak tersedia"}
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
                          M {eq.magnitude ?? "-"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                        <Clock className="h-3 w-3" />
                        <span>
                          {eq.time
                            ? new Date(eq.time).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Card */}
        <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80 mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
              <Filter className="h-5 w-5 text-purple-600" />
              Parameter Analisis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Tanggal Mulai
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-slate-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Tanggal Akhir
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-slate-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Ukuran Grid (km)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 20].map((size) => (
                    <Button
                      key={size}
                      variant={gridSize === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGridSize(size as 5 | 10 | 20)}
                      className={
                        gridSize === size
                          ? "bg-purple-600 hover:bg-purple-700 text-white flex-1 min-w-[60px]"
                          : "border-slate-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 flex-1 min-w-[60px]"
                      }
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Magnitudo Min
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={minMagnitude}
                  onChange={(e) => setMinMagnitude(Number(e.target.value))}
                  className="border border-slate-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-2 justify-end">
                <div className="flex gap-2">
                  <Button
                    onClick={fetchAnalysis}
                    disabled={loading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {loading ? "Memproses..." : "Analisis"}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="border-slate-200 dark:border-zinc-700 dark:text-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 hover:bg-slate-50"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Section */}
        <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
                <MapPin className="h-5 w-5 text-purple-600" />
                Peta Frekuensi Gempa
              </CardTitle>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600"
                    checked={showBpbdLayer}
                    onChange={(e) => setShowBpbdLayer(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                    Data Risiko BPBD
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                    checked={showEarthquakes}
                    onChange={(e) => setShowEarthquakes(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                    Titik Gempa
                  </span>
                </label>

                {data && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-xs text-slate-600 dark:text-zinc-400">
                        Rendah (0-2)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-amber-500 rounded"></div>
                      <span className="text-sm text-slate-600 dark:text-zinc-400">
                        Sedang (3-5)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm text-slate-600 dark:text-zinc-400">
                        Tinggi (&gt;5)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800/50">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
                  <div className="text-center">
                    <Layers className="h-12 w-12 text-purple-400 mx-auto mb-3 animate-pulse" />
                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                      Menganalisis data...
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                      Mohon tunggu sebentar
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/10">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {error}
                    </p>
                    <Button
                      onClick={fetchAnalysis}
                      className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Coba Lagi
                    </Button>
                  </div>
                </div>
              ) : data ? (
                <FrequencyMap
                  grids={data.grids}
                  showBpbdLayer={showBpbdLayer}
                  showEarthquakes={showEarthquakes}
                  earthquakes={earthquakes}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Klik tombol Analisis untuk memulai
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
