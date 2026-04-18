"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { analysisApi, type FrequencyAnalysisResponse } from "@/api/analysis";
import dynamic from "next/dynamic";
import {
  Activity,
  Filter,
  Layers,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  MapPin,
} from "lucide-react";

const FrequencyMap = dynamic(() => import("./components/frequency-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-zinc-950">
      <div className="text-center">
        <Layers className="h-12 w-12 text-slate-400 dark:text-zinc-600 mx-auto mb-2 animate-pulse" />
        <p className="text-sm text-slate-500 dark:text-zinc-500">Loading map...</p>
      </div>
    </div>
  ),
});

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FrequencyAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

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
              Analisis Frekuensi Gempa
            </h1>
          </div>
          <p className="text-slate-600 dark:text-zinc-400">
            Analisis spasial frekuensi kejadian gempa bumi berdasarkan data
            historis
          </p>
        </div>

        {/* Statistics Cards */}
        {data && !loading && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
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

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
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

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
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

            <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
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

        {/* Filter Card */}
        <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 mb-6">
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
        <Card className="border border-slate-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
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
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Data Risiko BPBD</span>
                </label>

                {data && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-xs text-slate-600 dark:text-zinc-400">Rendah (0-2)</span>
                    </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded"></div>
                    <span className="text-sm text-slate-600 dark:text-zinc-400">Sedang (3-5)</span>
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
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                    <Button
                      onClick={fetchAnalysis}
                      className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Coba Lagi
                    </Button>
                  </div>
                </div>
              ) : data ? (
                <FrequencyMap grids={data.grids} showBpbdLayer={showBpbdLayer} />
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
