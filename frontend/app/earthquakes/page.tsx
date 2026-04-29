"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { earthquakeApi } from "@/api";
import type { Earthquake } from "@/types";
import {
  AlertTriangle,
  MapPin,
  Clock,
  Activity,
  Filter,
  TrendingUp,
  Layers,
  Calendar,
  RefreshCw,
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

function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 6) return "bg-red-600 dark:bg-red-900/60";
  if (magnitude >= 5) return "bg-orange-500 dark:bg-orange-900/60";
  if (magnitude >= 4) return "bg-yellow-500 dark:bg-yellow-900/60";
  return "bg-green-500 dark:bg-green-900/60";
}

function getMagnitudeBadgeColor(magnitude: number): string {
  if (magnitude >= 6)
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
  if (magnitude >= 5)
    return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
  if (magnitude >= 4)
    return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
  return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
}

function getMagnitudeLabel(magnitude: number): string {
  if (magnitude >= 6) return "Sangat Besar";
  if (magnitude >= 5) return "Besar";
  if (magnitude >= 4) return "Sedang";
  return "Ringan";
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-3 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900 dark:text-zinc-100 mb-1">
          {label}
        </p>
        <p className="text-orange-600 dark:text-orange-400 text-sm">
          Magnitudo: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function EarthquakesPage() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regionFilter, setRegionFilter] = useState("Bantul");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchEarthquakes = async (overrides?: {
    start?: string;
    end?: string;
    reg?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await earthquakeApi.getAll({
        startDate:
          (overrides?.start !== undefined ? overrides.start : startDate) ||
          undefined,
        endDate:
          (overrides?.end !== undefined ? overrides.end : endDate) || undefined,
        region:
          (overrides?.reg !== undefined ? overrides.reg : regionFilter) === ""
            ? undefined
            : overrides?.reg !== undefined
              ? overrides.reg
              : regionFilter,
        limit: 100, 
      });
      setEarthquakes(data.data);
      setCurrentPage(1);
    } catch (err) {
      setError("Gagal memuat data gempa");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarthquakes();
  }, []);

  const stats = {
    total: earthquakes.length,
    highMagnitude: earthquakes.filter((eq) => eq.magnitude >= 5).length,
    avgMagnitude:
      earthquakes.length > 0
        ? (
            earthquakes.reduce((sum, eq) => sum + eq.magnitude, 0) /
            earthquakes.length
          ).toFixed(1)
        : 0,
    avgDepth:
      earthquakes.length > 0
        ? (
            earthquakes.reduce((sum, eq) => sum + eq.depth, 0) /
            earthquakes.length
          ).toFixed(0)
        : 0,
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8">
      <div className="container mx-auto px-4 ">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
              Data Gempa Bumi
            </h1>
          </div>
          <p className="text-slate-600 dark:text-zinc-400">
            Histori dan data gempa bumi dari BMKG untuk wilayah Bantul dan
            sekitarnya
          </p>
          <div className="mt-3 text-xs italic text-slate-500 dark:text-slate-400">
            *Sumber data gempa pada sistem ini berasal dari BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) melalui layanan Data Gempabumi Terbuka BMKG.
          </div>
        </div>

        {/* BENTO GRID: Stats & Line Chart */}
        {!loading && earthquakes.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            {/* Left: 2x2 Stats Grid (4 columns width on desktop) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
              <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col justify-center">
                <CardContent className="p-4 sm:pt-6">
                  <div className="flex flex-col items-start gap-2">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none">
                        {stats.total}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">
                        Total Gempa
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col justify-center">
                <CardContent className="p-4 sm:pt-6">
                  <div className="flex flex-col items-start gap-2">
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-500 leading-none">
                        {stats.highMagnitude}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">
                        Magnitudo ≥ 5
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col justify-center">
                <CardContent className="p-4 sm:pt-6">
                  <div className="flex flex-col items-start gap-2">
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none">
                        {stats.avgMagnitude}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">
                        Rata-rata Mag
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col justify-center">
                <CardContent className="p-4 sm:pt-6">
                  <div className="flex flex-col items-start gap-2">
                    <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-zinc-100 leading-none">
                        {stats.avgDepth}
                        <span className="text-sm text-slate-500 dark:text-zinc-500 ml-1">
                          km
                        </span>
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-500 mt-1 uppercase tracking-wider">
                        Rata Kedalaman
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Trend Chart (8 columns width on desktop) */}
            <Card className="lg:col-span-8 border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                  Tren Magnitudo (30 Gempa Terakhir)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#888888"
                      strokeOpacity={0.2}
                    />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#888888", fontSize: 12 }}
                      minTickGap={20}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#888888", fontSize: 12 }}
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="magnitude"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={{
                        fill: "#f97316",
                        strokeWidth: 2,
                        r: 4,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Streamlined Filter Toolbar */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 mb-6 flex flex-col sm:flex-row items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-slate-200 dark:border-zinc-800 sm:w-auto w-full text-sm font-medium text-slate-700 dark:text-zinc-300">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">Filter</span>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative flex-1 w-full flex items-center">
              <Calendar className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 h-10 w-full border-slate-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-slate-400 hidden sm:block">-</span>
            <div className="relative flex-1 w-full flex items-center">
              <Calendar className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9 h-10 w-full border border-slate-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative flex-1 w-full flex items-center">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="h-10 w-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 px-3 cursor-pointer appearance-none"
              >
                <option value="Bantul">Khusus Bantul</option>
                <option value="">Semua Wilayah</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => fetchEarthquakes()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 flex-1 sm:flex-none rounded-lg transition-colors"
                disabled={loading}
              >
                <Filter className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Terapkan</span>
              </Button>
              {(startDate || endDate || regionFilter !== "Bantul") && (
                <Button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setRegionFilter("Bantul");
                    fetchEarthquakes({ start: "", end: "", reg: "Bantul" });
                  }}
                  variant="outline"
                  className="border-slate-200 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-300 hover:bg-slate-50 h-10 w-10 p-0 rounded-lg flex items-center justify-center shrink-0"
                  title="Reset Filter"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Data List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Gagal Memuat Data
                </h3>
                <p className="text-slate-600 mb-4">{error}</p>
                <Button
                  onClick={() => fetchEarthquakes()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Coba Lagi
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : earthquakes.length === 0 ? (
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-slate-100 rounded-full mb-4">
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Tidak Ada Data
                </h3>
                <p className="text-slate-500">
                  Tidak ada data gempa dalam periode yang dipilih
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {earthquakes
                .slice(
                  (currentPage - 1) * ITEMS_PER_PAGE,
                  currentPage * ITEMS_PER_PAGE,
                )
                .map((eq, index) => (
                  <Card
                    key={eq.id}
                    className="border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
                  >
                    <div className="flex flex-row items-stretch border-b border-slate-100 dark:border-zinc-800">
                      {/* Magnitude Sidebar/Badge indicator */}
                      <div
                        className={`w-20 sm:w-24 flex flex-col items-center justify-center p-3 ${getMagnitudeColor(eq.magnitude)} shrink-0`}
                      >
                        <div className="text-3xl font-bold text-white dark:text-zinc-50 tracking-tighter">
                          {eq.magnitude}
                        </div>
                        <div className="text-[9px] uppercase tracking-widest font-semibold text-white/80 dark:text-zinc-300">
                          Mag
                        </div>
                      </div>

                      {/* Info Top Section */}
                      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 font-medium ${getMagnitudeBadgeColor(eq.magnitude)}`}
                          >
                            {getMagnitudeLabel(eq.magnitude)}
                          </Badge>
                          {eq.isLatest && (
                            <Badge className="text-[10px] px-2 py-0.5 bg-red-600 text-white border-0 dark:bg-red-900/50 dark:text-red-200">
                              Live
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-auto">
                            #{earthquakes.length - index}
                          </span>
                        </div>
                        <h3
                          className="text-base font-bold text-slate-900 dark:text-zinc-100 leading-tight mb-1 line-clamp-1"
                          title={eq.location}
                        >
                          {eq.location}
                        </h3>
                        <p
                          className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 line-clamp-1"
                          title={eq.region}
                        >
                          <MapPin className="h-3 w-3 shrink-0" />
                          {eq.region}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-slate-50/50 dark:bg-zinc-950 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 px-2 border-l-2 border-slate-200 dark:border-zinc-700">
                          <Clock className="h-4 w-4 text-blue-500 opacity-70 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                              Waktu
                            </p>
                            <p className="text-xs font-medium text-slate-900 dark:text-zinc-200">
                              {new Date(eq.time).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              WIB
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                              {new Date(eq.time).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-2 border-l-2 border-slate-200 dark:border-zinc-700">
                          <Activity className="h-4 w-4 text-green-500 opacity-70 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                              Kedalaman
                            </p>
                            <p className="text-sm font-bold text-slate-900 dark:text-zinc-200 mt-0.5">
                              {eq.depth}{" "}
                              <span className="text-[10px] font-normal text-slate-500">
                                km
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {eq.dirasakan && (
                        <div className="mt-1 flex items-start gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                          <span
                            className="line-clamp-2"
                            title={`Dirasakan: ${eq.dirasakan}`}
                          >
                            <span className="font-semibold">Dirasakan:</span>{" "}
                            {eq.dirasakan}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>

            {/* Pagination Controls */}
            {Math.ceil(earthquakes.length / ITEMS_PER_PAGE) > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm">
                <Button
                  variant="outline"
                  className="border-slate-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <div className="text-sm font-medium text-slate-700 dark:text-zinc-400">
                  Halaman {currentPage} dari{" "}
                  {Math.ceil(earthquakes.length / ITEMS_PER_PAGE)}
                </div>
                <Button
                  variant="outline"
                  className="border-slate-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        Math.ceil(earthquakes.length / ITEMS_PER_PAGE),
                      ),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(earthquakes.length / ITEMS_PER_PAGE)
                  }
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
