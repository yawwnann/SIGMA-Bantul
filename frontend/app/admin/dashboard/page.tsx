"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dashboardApi, shelterApi, evacuationApi, apiClient } from "@/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DashboardStats } from "@/types";
import {
  Shield,
  Map,
  Activity,
  Compass,
  Home,
  Building,
  Clock,
  MapPin,
  ArrowRight,
  ShieldAlert,
  BarChart3,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rawStats, setRawStats] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, shelterStats, routeStats] = await Promise.all([
          dashboardApi.getSummary(),
          shelterApi.getStatistics(),
          evacuationApi.getStatistics(),
        ]);
        // dashboardData shape: { earthquake: { total, last30Days }, shelter, latestEarthquake, ... }
        const data = dashboardData as unknown as {
          earthquake?: { total?: number };
          latestEarthquake?: DashboardStats["latestEarthquake"];
          earthquakeCount?: number;
        };
        setRawStats(dashboardData as unknown as Record<string, unknown>);
        setStats({
          shelterCount: shelterStats.total || 0,
          earthquakeCount: data.earthquake?.total ?? data.earthquakeCount ?? 0,
          routeCount: routeStats.totalRoutes || 0,
          latestEarthquake: data.latestEarthquake,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast.error("Gagal memuat data dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-2 animate-in fade-in duration-500">
        <div className="container mx-auto">
          <div className="flex flex-col gap-2 mb-8">
            <div className="h-10 bg-zinc-800 rounded w-64 animate-pulse" />
            <div className="h-5 bg-zinc-800 rounded w-96 animate-pulse" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="border border-zinc-800 shadow-sm bg-zinc-900/50"
              >
                <CardContent className="p-6">
                  <div className="h-12 bg-zinc-800 rounded-lg w-12 mb-4 animate-pulse" />
                  <div className="h-8 bg-zinc-800 rounded w-1/3 mb-2 animate-pulse" />
                  <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 w-full px-4 sm:px-6 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <BarChart3 className="w-10 h-10 text-blue-500" />
          </div>
          Dashboard
        </h1>
        <p className="text-zinc-400 max-w-3xl text-xl mt-1">
          Pantau pusat kendali operasi dan analitik krisis gempa bumi wilayah
          Kabupaten Bantul.
        </p>

        {/* Test Notification Button */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="outline"
            className="border-orange-800 text-orange-400 hover:bg-orange-900/20 hover:text-orange-300"
            onClick={async () => {
              try {
                const response = await apiClient.get("/notifications/test");
                const data = response.data;
                toast.success(
                  `Notifikasi test dikirim! Success: ${data.successCount || 0}, Error: ${data.errorCount || 0}`,
                );
              } catch (error) {
                console.error("Test notification error:", error);
                toast.error("Gagal mengirim notifikasi test");
              }
            }}
          >
            <Activity className="w-4 h-4 mr-2" />
            Test Push Notifikasi
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Shelter Card */}
        <Card className="border border-zinc-800 bg-zinc-900/40 relative overflow-hidden group hover:bg-zinc-900/80 transition-all duration-300 hover:border-blue-500/30">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Home className="w-40 h-40" />
          </div>
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 shadow-inner">
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-zinc-400">
                Total Shelter
              </h3>
              <div className="text-5xl font-bold tracking-tight text-white">
                {stats?.shelterCount || 0}
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm">
              <Badge
                variant="outline"
                className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 text-sm font-medium"
              >
                Aktif Beroperasi
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Earthquake Card */}
        <Card className="border border-zinc-800 bg-zinc-900/40 relative overflow-hidden group hover:bg-zinc-900/80 transition-all duration-300 hover:border-emerald-500/30">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Activity className="w-40 h-40" />
          </div>
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-inner">
              <Activity className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-zinc-400">
                Total Gempa
              </h3>
              <div className="text-5xl font-bold tracking-tight text-white">
                {stats?.earthquakeCount || 0}
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 text-sm font-medium"
              >
                Data Terekam
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Routes Card */}
        <Card className="border border-zinc-800 bg-zinc-900/40 relative overflow-hidden group hover:bg-zinc-900/80 transition-all duration-300 hover:border-purple-500/30">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Compass className="w-40 h-40" />
          </div>
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 shadow-inner">
              <Compass className="h-8 w-8 text-purple-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-zinc-400">
                Manajemen Evakuasi
              </h3>
              <div className="text-5xl font-bold tracking-tight text-white">
                {stats?.routeCount || 0}
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm">
              <Badge
                variant="outline"
                className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3 py-1 text-sm font-medium"
              >
                Rute Tersedia
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Latest Earthquake Card */}
        <Card className="border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900 relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <ShieldAlert className="w-40 h-40 text-red-500" />
          </div>
          <CardContent className="p-8 flex flex-col h-full justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-inner shrink-0">
                <Clock className="h-5 w-5 text-red-500 animate-pulse" />
              </div>
              <h3 className="text-base font-medium text-zinc-300">
                Gempa Terbaru
              </h3>
            </div>

            {stats?.latestEarthquake ? (
              <div className="space-y-4 relative z-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-red-500 tracking-tighter">
                    M{stats.latestEarthquake.magnitude}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-base text-zinc-300">
                    <MapPin className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                    <span className="leading-tight">
                      {stats.latestEarthquake.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 ml-7">
                    <span>
                      {new Date(stats.latestEarthquake.time).toLocaleString(
                        "id-ID",
                        { dateStyle: "long", timeStyle: "short" },
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-50 py-4">
                <Activity className="h-10 w-10 mb-2" />
                <p className="text-sm">Belum ada data terbaru</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Quick Actions Panel */}
        <Card className="md:col-span-1 border border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/50 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-500" />
              Aksi Cepat
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Pintasan menu manajemen sistem
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Link href="/admin/shelters" className="block group">
              <Button
                variant="ghost"
                className="w-full justify-between bg-zinc-950/50 border border-zinc-800/50 text-zinc-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all duration-300 h-12"
              >
                <div className="flex items-center">
                  <Home className="mr-3 h-4 w-4" /> Manajemen Shelter
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </Button>
            </Link>
            <Link href="/admin/facilities" className="block group">
              <Button
                variant="ghost"
                className="w-full justify-between bg-zinc-950/50 border border-zinc-800/50 text-zinc-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all duration-300 h-12"
              >
                <div className="flex items-center">
                  <Building className="mr-3 h-4 w-4" /> Layanan Fasilitas
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </Button>
            </Link>
            <Link href="/admin/routes" className="block group">
              <Button
                variant="ghost"
                className="w-full justify-between bg-zinc-950/50 border border-zinc-800/50 text-zinc-300 hover:bg-purple-600 hover:text-white hover:border-purple-500 transition-all duration-300 h-12"
              >
                <div className="flex items-center">
                  <Compass className="mr-3 h-4 w-4" /> Manajemen Evakuasi
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </Button>
            </Link>
            <div className="h-px bg-zinc-800 my-2" />
            <Link href="/map" className="block group">
              <Button className="w-full justify-between bg-zinc-100 text-zinc-900 hover:bg-white hover:scale-[1.02] transition-all duration-300 shadow-xl h-12 font-semibold">
                <div className="flex items-center">
                  <Map className="mr-3 h-4 w-4" /> Buka Peta Analisis
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Spatial Stats Panel */}
        <Card className="md:col-span-2 border border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/50 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Map className="h-5 w-5 text-emerald-500" />
              Distribusi Pemetaan Spasial
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Ringkasan geospasial titik rawan dan evakuasi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            {rawStats ? (
              (() => {
                const eq = rawStats.earthquake as
                  | Record<string, number>
                  | undefined;
                const hz = rawStats.hazardZone as
                  | Record<string, number>
                  | undefined;
                const sh = rawStats.shelter as
                  | Record<string, number>
                  | undefined;
                const ev = rawStats.evacuation as
                  | Record<string, number>
                  | undefined;
                const items = [
                  {
                    label: "Gempa 30 Hari",
                    value: eq?.last30Days ?? 0,
                    sub: `Rata-rata M${eq?.averageMagnitude ?? 0}`,
                    color: "text-red-400",
                    bg: "bg-red-500/10",
                    border: "border-red-500/20",
                  },
                  {
                    label: "Zona Rawan",
                    value: hz?.total ?? 0,
                    sub: `${hz?.critical ?? 0} Kritis · ${hz?.high ?? 0} Tinggi`,
                    color: "text-orange-400",
                    bg: "bg-orange-500/10",
                    border: "border-orange-500/20",
                  },
                  {
                    label: "Kapasitas Shelter",
                    value: sh?.totalCapacity ?? 0,
                    sub: `${sh?.goodCondition ?? 0} kondisi baik`,
                    color: "text-blue-400",
                    bg: "bg-blue-500/10",
                    border: "border-blue-500/20",
                  },
                  {
                    label: "Rute Evakuasi",
                    value: ev?.totalRoutes ?? 0,
                    sub: `Skor rata-rata ${ev?.averageScore ?? 0}`,
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10",
                    border: "border-emerald-500/20",
                  },
                ];
                return (
                  <div className="grid grid-cols-2 gap-4 h-full">
                    {items.map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl border ${item.border} ${item.bg} p-5 flex flex-col justify-between`}
                      >
                        <span className="text-sm text-zinc-400 font-medium">
                          {item.label}
                        </span>
                        <div>
                          <div
                            className={`text-4xl font-black tracking-tight ${item.color}`}
                          >
                            {item.value.toLocaleString("id-ID")}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {item.sub}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                Memuat data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
