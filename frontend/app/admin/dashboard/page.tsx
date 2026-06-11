"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dashboardApi, evacuationLocationApi, evacuationApi } from "@/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DashboardStats } from "@/types";
import {
  Map,
  Compass,
  Home,
  Building,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Users,
  UserCheck,
  Route,
  Activity,
  Clock,
  MapPin,
  AlertTriangle,
  Waves
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
        const [dashboardData, evacuationLocationStats, routeStats] = await Promise.all([
          dashboardApi.getSummary(),
          evacuationLocationApi.getStatistics(),
          evacuationApi.getStatistics(),
        ]);

        setRawStats(dashboardData as unknown as Record<string, unknown>);
        setStats({
          evacuationLocationCount: evacuationLocationStats.total || 0,
          earthquakeCount: (dashboardData as any).earthquake?.total ?? 0,
          routeCount: routeStats.totalRoutes || 0,
          latestEarthquake: (dashboardData as any).latestEarthquake,
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

  // Extract variables for easy rendering
  const evLoc = rawStats?.evacuationLocation as Record<string, number> | undefined;
  const hz = rawStats?.hazardZone as Record<string, number> | undefined;
  const evRoute = rawStats?.evacuation as Record<string, number> | undefined;
  const rd = rawStats?.road as Record<string, number> | undefined;
  const latestEq = rawStats?.latestEarthquake as Record<string, any> | undefined;
  const eqStats = rawStats?.earthquake as Record<string, any> | undefined;


  const totalCapacity = evLoc?.totalCapacity ?? 0;
  const currentOccupancy = evLoc?.currentOccupancy ?? 0;
  const occupancyPercent = totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(new Date(dateStr));
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="py-6 w-full px-4 sm:px-6 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight dark:text-white text-slate-900 flex items-center gap-4">

          Dashboard Admin
        </h1>
        <p className="text-zinc-400 max-w-3xl text-xl mt-1">
          Pantau pusat kendali operasi dan analitik krisis gempa bumi wilayah Kabupaten Bantul secara real-time.
        </p>
      </div>

      {/* KPI Cards (4 columns) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Lokasi Evakuasi */}
        <Card className="border border-zinc-800 bg-zinc-900/40 relative overflow-hidden group hover:bg-zinc-900/80 transition-all duration-300 hover:border-blue-500/30">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Home className="w-40 h-40" />
          </div>
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20 shadow-inner">
              <Home className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-400">Total Lokasi Evakuasi</h3>
              <div className="text-3xl font-bold tracking-tight dark:text-white text-slate-900">
                {evLoc?.total || 0}
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              <span className="text-emerald-400 font-medium">{evLoc?.goodCondition || 0}</span> lokasi kondisi baik
            </p>
          </CardContent>
        </Card>

        {/* Kapasitas */}
        <Card className="border border-zinc-800 bg-zinc-900/40 relative overflow-hidden group hover:bg-zinc-900/80 transition-all duration-300 hover:border-emerald-500/30">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Users className="w-40 h-40" />
          </div>
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-inner">
              <Users className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-400">Kapasitas Keseluruhan</h3>
              <div className="text-3xl font-bold tracking-tight dark:text-white text-slate-900">
                {totalCapacity.toLocaleString("id-ID")} <span className="text-base text-zinc-500 font-normal">jiwa</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Sedang menampung <span className={occupancyPercent > 85 ? "text-red-400 font-medium" : "text-emerald-400 font-medium"}>{currentOccupancy.toLocaleString("id-ID")}</span> pengungsi
            </p>
          </CardContent>
        </Card>

        {/* Riwayat Gempa */}
        <Card className="border border-zinc-800 bg-zinc-900/40 relative overflow-hidden group hover:bg-zinc-900/80 transition-all duration-300 hover:border-orange-500/30">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Activity className="w-40 h-40" />
          </div>
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4 border border-orange-500/20 shadow-inner">
              <Activity className="h-6 w-6 text-orange-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-400">Total Kejadian Gempa</h3>
              <div className="text-3xl font-bold tracking-tight dark:text-white text-slate-900">
                {eqStats?.total?.toLocaleString("id-ID") || 0}
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              <span className="text-orange-400 font-medium">{eqStats?.last30Days?.toLocaleString("id-ID") || 0}</span> kejadian dalam 30 hari terakhir
            </p>
          </CardContent>
        </Card>

        {/* Total Petugas */}
        <Card className="border border-zinc-800 bg-zinc-900/40 relative overflow-hidden group hover:bg-zinc-900/80 transition-all duration-300 hover:border-purple-500/30">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-transform duration-500">
            <UserCheck className="w-40 h-40" />
          </div>
          <CardContent className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20 shadow-inner">
              <UserCheck className="h-6 w-6 text-purple-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-400">Petugas Aktif</h3>
              <div className="text-3xl font-bold tracking-tight dark:text-white text-slate-900">
                {evLoc?.totalOfficers || 0}
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Tersebar di lokasi evakuasi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Latest Earthquake Info */}
        <Card className="border border-slate-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-200 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-900/50 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-500" />
                  Informasi Gempa Terkini
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-zinc-400 mt-1">
                  Data seismik terbaru dari BMKG
                </CardDescription>
              </div>
              <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs font-semibold text-red-500">Live Update</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            {latestEq ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-500/20 shadow-inner flex-shrink-0">
                    <span className="text-xl font-bold text-red-600 dark:text-red-500">{latestEq.magnitude}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Waktu Kejadian
                    </h4>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{formatDate(latestEq.time)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-800/50 rounded-lg">
                    <h4 className="text-xs font-medium text-slate-500 dark:text-zinc-500 flex items-center gap-2 mb-1">
                      <MapPin className="w-3 h-3" /> Lokasi
                    </h4>
                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{latestEq.location}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{latestEq.region}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-800/50 rounded-lg flex flex-col justify-center">
                    <h4 className="text-xs font-medium text-slate-500 dark:text-zinc-500 flex items-center gap-2 mb-1">
                      <Waves className="w-3 h-3" /> Kedalaman
                    </h4>
                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{latestEq.depth} km</p>
                  </div>
                </div>

                {latestEq.dirasakan && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg">
                    <h4 className="text-xs font-medium text-orange-600 dark:text-orange-500 flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3 h-3" /> Dirasakan (Skala MMI)
                    </h4>
                    <p className="text-sm text-orange-800 dark:text-orange-200/90">{latestEq.dirasakan}</p>
                  </div>
                )}

                {latestEq.potential && (
                  <div className="p-3 bg-zinc-950/30 border border-zinc-800/50 rounded-lg">
                    <p className="text-xs text-zinc-400">{latestEq.potential}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 py-8">
                <Activity className="w-8 h-8 opacity-20" />
                <p className="text-sm">Data gempa tidak tersedia</p>
              </div>
            )}

            {/* Removed Live Map button */}
          </CardContent>
        </Card>

        {/* Spatial Stats Panel */}
        <Card className="border border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/50 pb-4">
            <CardTitle className="text-lg font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <Route className="h-5 w-5 text-emerald-500" />
              Statistik Infrastruktur Jalan
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Ringkasan data kondisi infrastruktur jalan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 flex-1">
            <div className="flex flex-col gap-4 justify-center h-full">
              <div className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <div>
                  <h4 className="text-sm font-medium text-zinc-400">Total Ruas Jalan</h4>
                  <p className="text-2xl font-bold text-white mt-1">{rd?.total?.toLocaleString("id-ID") || 0}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-medium text-zinc-400">Total Panjang</h4>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{rd?.totalLength?.toLocaleString("id-ID") || 0} km</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <h4 className="text-xs font-medium text-emerald-500 mb-1">Kondisi Baik</h4>
                  <p className="text-lg font-bold text-emerald-400">{rd?.goodCondition?.toLocaleString("id-ID") || 0} <span className="text-xs font-normal opacity-70">ruas</span></p>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <h4 className="text-xs font-medium text-blue-500 mb-1">Kondisi Sedang</h4>
                  <p className="text-lg font-bold text-blue-400">{rd?.moderateCondition?.toLocaleString("id-ID") || 0} <span className="text-xs font-normal opacity-70">ruas</span></p>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <h4 className="text-xs font-medium text-orange-500 mb-1">Kondisi Buruk</h4>
                  <p className="text-lg font-bold text-orange-400">{rd?.poorCondition?.toLocaleString("id-ID") || 0} <span className="text-xs font-normal opacity-70">ruas</span></p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <h4 className="text-xs font-medium text-red-500 mb-1">Kondisi Rusak</h4>
                  <p className="text-lg font-bold text-red-400">{rd?.damagedCondition?.toLocaleString("id-ID") || 0} <span className="text-xs font-normal opacity-70">ruas</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
