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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-3 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900 dark:text-zinc-100 mb-1">
          Bulan: {label}
        </p>
        <p className="text-emerald-600 dark:text-emerald-400 text-sm">
          Jumlah Gempa: <span className="font-bold">{payload[0].value}</span> kejadian
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FrequencyAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Earthquake history states
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [earthquakesLoading, setEarthquakesLoading] = useState(true);
  const [recentEarthquakes, setRecentEarthquakes] = useState<Earthquake[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    avgMagnitude: "0.0",
    maxMagnitude: 0,
    avgDepth: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [trendData, setTrendData] = useState<{ time: string; count: number }[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    return "2021-01-01";
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [gridSize, setGridSize] = useState<5 | 10 | 20>(5);
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [showBpbdLayer, setShowBpbdLayer] = useState(false);
  const [showEarthquakes, setShowEarthquakes] = useState(false);
  const [earthquakeLimit, setEarthquakeLimit] = useState(100);
  const [earthquakeRegion, setEarthquakeRegion] = useState("Semua Wilayah");
  const [earthquakeYear, setEarthquakeYear] = useState("5 Tahun Terakhir");
  const [selectedEarthquakeId, setSelectedEarthquakeId] = useState<number | null>(null);

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

  const fetchOverallStats = async () => {
    setStatsLoading(true);
    setTrendLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 5;
      const start = `${startYear}-01-01T00:00:00Z`;
      const end = `${currentYear}-12-31T23:59:59Z`;

      const response = await earthquakeApi.getAll({
        limit: 20000,
        startDate: start,
        endDate: end,
      });

      const allData = response.data;
      setRecentEarthquakes(allData.slice(0, 30));

      // Calculate overall statistics
      if (allData.length > 0) {
        const total = response.meta?.total || allData.length;
        const avgMag = (allData.reduce((sum, eq) => sum + eq.magnitude, 0) / allData.length).toFixed(1);
        const maxMag = Math.max(...allData.map(eq => eq.magnitude));
        const avgDep = Math.round(allData.reduce((sum, eq) => sum + eq.depth, 0) / allData.length);

        setStats({
          total,
          avgMagnitude: avgMag,
          maxMagnitude: maxMag,
          avgDepth: avgDep,
        });

        // Calculate monthly frequency trend
        const monthlyCounts: Record<string, number> = {};
        
        for (let y = startYear; y <= currentYear; y++) {
          for (let m = 1; m <= 12; m++) {
            if (y === currentYear && m > new Date().getMonth() + 1) break;
            const monthStr = String(m).padStart(2, "0");
            monthlyCounts[`${y}-${monthStr}`] = 0;
          }
        }

        allData.forEach((eq) => {
          if (!eq.time) return;
          const date = new Date(eq.time);
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, "0");
          const key = `${y}-${m}`;
          if (monthlyCounts[key] !== undefined) {
            monthlyCounts[key]++;
          }
        });

        const trend = Object.keys(monthlyCounts)
          .sort()
          .map((key) => {
            const [y, m] = key.split("-");
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
            const monthName = monthNames[parseInt(m) - 1];
            return {
              time: `${monthName} ${y}`,
              count: monthlyCounts[key],
            };
          });

        setTrendData(trend);
      } else {
        setStats({
          total: 0,
          avgMagnitude: "0.0",
          maxMagnitude: 0,
          avgDepth: 0,
        });
        setTrendData([]);
      }
    } catch (err) {
      console.error("Failed to fetch overall statistics:", err);
    } finally {
      setStatsLoading(false);
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  useEffect(() => {
    fetchOverallStats();
  }, []);

  const fetchEarthquakeHistory = async () => {
    setEarthquakesLoading(true);
    let start, end;
    if (earthquakeYear !== "5 Tahun Terakhir") {
      start = `${earthquakeYear}-01-01T00:00:00Z`;
      end = `${earthquakeYear}-12-31T23:59:59Z`;
    }

    try {
      // Server-side filtering: kirim region=bantul ke backend
      const regionParam = earthquakeRegion === "Bantul" ? "bantul" : undefined;

      const response = await earthquakeApi.getAll({
        limit: earthquakeLimit,
        region: regionParam,
        startDate: start,
        endDate: end,
      });

      setEarthquakes(response.data);
    } catch (err) {
      console.error("Failed to fetch earthquake history:", err);
    } finally {
      setEarthquakesLoading(false);
    }
  };

  useEffect(() => {
    fetchEarthquakeHistory();
  }, [earthquakeLimit, earthquakeRegion, earthquakeYear]);

  const handleReset = () => {
    setStartDate("2021-01-01");
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
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4 mb-6 animate-in fade-in duration-300">
            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Total Gempa
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-zinc-100 mt-1">
                      {stats.total.toLocaleString("id-ID")}
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
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Rata-rata Magnitudo
                    </p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                      {stats.avgMagnitude}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Magnitudo Maksimum
                    </p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-500 mt-1">
                      M {stats.maxMagnitude.toFixed(1)}
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
                    <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      Rata-rata Kedalaman
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                      {stats.avgDepth} <span className="text-sm font-medium text-slate-500">km</span>
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <Layers className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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
                Tren Frekuensi Gempa Bumi (5 Tahun Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[250px] pt-4 pr-6 pb-2">
              {trendLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="w-full h-[200px]" />
                </div>
              ) : (
                <div className="w-full overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
                  <div className="min-w-[700px] h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#888888"
                      strokeOpacity={0.2}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={15}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Jumlah Kejadian"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 1.5 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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
                  30 terakhir
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-auto max-h-[290px]">
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/50">
                {statsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentEarthquakes.length === 0 ? (
                  <div className="p-4 flex items-center justify-center text-slate-500 dark:text-zinc-400 h-[100px]">
                    Tidak ada data gempa
                  </div>
                ) : (
                  recentEarthquakes.map((eq, i) => (
                    <div
                      key={`eq-${eq.id}-${i}`}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedEarthquakeId(eq.id);
                        setShowEarthquakes(true);
                        document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
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

        {/* Map Section */}
        <Card id="map-section" className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950/80">
          <CardHeader className="pb-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
                <MapPin className="h-5 w-5 text-purple-600" />
                Peta Frekuensi Gempa
              </CardTitle>

              <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600"
                    checked={showBpbdLayer}
                    onChange={(e) => setShowBpbdLayer(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                    Data Risiko BPBD
                  </span>
                </label>

                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                      checked={showEarthquakes}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShowEarthquakes(checked);
                        if (checked && earthquakeRegion === "Semua Wilayah") {
                          setEarthquakeRegion("Bantul");
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                      Titik Gempa
                    </span>
                  </label>

                  {showEarthquakes && (
                    <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                      <Select
                        value={earthquakeYear}
                        onValueChange={(val) => setEarthquakeYear(val || "5 Tahun Terakhir")}
                      >
                        <SelectTrigger className="h-[34px] w-[130px] text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                          <SelectValue placeholder="Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5 Tahun Terakhir">5 Tahun Terakhir</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2021">2021</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={earthquakeRegion}
                        onValueChange={(val) => setEarthquakeRegion(val || "Semua Wilayah")}
                      >
                        <SelectTrigger className="h-[34px] w-[160px] text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                          <SelectValue placeholder="Wilayah" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bantul">Bantul</SelectItem>
                          <SelectItem value="Semua Wilayah">Semua Wilayah</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={earthquakeLimit.toString()}
                        onValueChange={(val) => setEarthquakeLimit(Number(val))}
                      >
                        <SelectTrigger className="h-[34px] w-[110px] text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700">
                          <SelectValue placeholder="Jumlah" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">100 Data</SelectItem>
                          <SelectItem value="500">500 Data</SelectItem>
                          <SelectItem value="1000">1000 Data</SelectItem>
                          <SelectItem value="5000">5000 Data</SelectItem>
                          <SelectItem value="10000">10000 Data</SelectItem>
                        </SelectContent>
                      </Select>


                    </div>
                  )}
                </div>
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
                  selectedEarthquakeId={selectedEarthquakeId}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Klik tombol Analisis untuk memulai
                  </p>
                </div>
              )}
            </div>

              {data && (
                <div className="mt-4 flex flex-col items-start gap-4 bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div className="w-full flex flex-col md:flex-row justify-between gap-6">
                    
                    {/* Legenda 1: Frekuensi Gempa per Desa (Hanya Tampil Jika BPBD OFF) */}
                    {!showBpbdLayer && (
                      <div>
                        <span className="block text-sm font-bold text-slate-800 dark:text-zinc-200 mb-2">
                          Legenda Peta Frekuensi Desa
                        </span>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-emerald-100 border border-emerald-500 rounded shadow-sm opacity-80 flex items-center justify-center">
                              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-zinc-400">
                              Aman (Nihil Gempa)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-yellow-500 border border-yellow-700 rounded shadow-sm opacity-80"></div>
                            <span className="text-sm text-slate-600 dark:text-zinc-400">
                              Risiko Rendah (Pernah Terjadi Gempa)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-orange-500 border border-orange-700 rounded shadow-sm opacity-80"></div>
                            <span className="text-sm text-slate-600 dark:text-zinc-400">
                              Risiko Sedang
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-red-600 border border-red-800 rounded shadow-sm opacity-80"></div>
                            <span className="text-sm text-slate-600 dark:text-zinc-400">
                              Risiko Tinggi (Sering Terjadi Gempa)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Legenda 2 & 3: Tambahan Layer BPBD & Titik Gempa */}
                    <div className="flex flex-col gap-6">
                      
                      {/* Titik Gempa */}
                      {showEarthquakes && (
                        <div>
                          <span className="block text-sm font-bold text-slate-800 dark:text-zinc-200 mb-2">
                            Legenda Titik Historis Gempa
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-md flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-zinc-400">
                              Pusat Titik Gempa Bumi
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Kawasan BPBD */}
                      {showBpbdLayer && (
                        <div>
                          <span className="block text-sm font-bold text-slate-800 dark:text-zinc-200 mb-2">
                            Legenda Kawasan BPBD
                          </span>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-1 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-slate-600 dark:text-zinc-400">Garis Kawasan Rendah</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-1 bg-amber-500 rounded-full"></div>
                              <span className="text-sm text-slate-600 dark:text-zinc-400">Garis Kawasan Sedang</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-1 bg-red-500 rounded-full"></div>
                              <span className="text-sm text-slate-600 dark:text-zinc-400">Garis Kawasan Tinggi</span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
