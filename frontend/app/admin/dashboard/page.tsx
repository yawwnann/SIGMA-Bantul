"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dashboardApi, shelterApi, evacuationApi } from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  BarChart3
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, shelterStats, routeStats] = await Promise.all([
          dashboardApi.getSummary(),
          shelterApi.getStatistics(),
          evacuationApi.getStatistics(),
        ]);
        setStats({
          shelterCount: shelterStats.total || 0,
          earthquakeCount: dashboardData.earthquakeCount || 0,
          routeCount: routeStats.totalRoutes || 0,
          latestEarthquake: dashboardData.latestEarthquake,
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
              <Card key={i} className="border border-zinc-800 shadow-sm bg-zinc-900/50">
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
          Pantau pusat kendali operasi dan analitik krisis gempa bumi wilayah Kabupaten Bantul.
        </p>
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
              <h3 className="text-base font-medium text-zinc-400">Total Shelter</h3>
              <div className="text-5xl font-bold tracking-tight text-white">
                {stats?.shelterCount || 0}
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 text-sm font-medium">Aktif Beroperasi</Badge>
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
              <h3 className="text-base font-medium text-zinc-400">Total Gempa</h3>
              <div className="text-5xl font-bold tracking-tight text-white">
                {stats?.earthquakeCount || 0}
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 text-sm font-medium">Data Terekam</Badge>
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
              <h3 className="text-base font-medium text-zinc-400">Jalur Evakuasi</h3>
              <div className="text-5xl font-bold tracking-tight text-white">
                {stats?.routeCount || 0}
              </div>
            </div>
            <div className="mt-6 flex items-center text-sm">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3 py-1 text-sm font-medium">Rute Tersedia</Badge>
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
              <h3 className="text-base font-medium text-zinc-300">Gempa Terbaru</h3>
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
                    <span className="leading-tight">{stats.latestEarthquake.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 ml-7">
                    <span>{new Date(stats.latestEarthquake.time).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}</span>
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
            <CardDescription className="text-zinc-400">Pintasan menu manajemen sistem</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Link href="/admin/shelters" className="block group">
              <Button variant="ghost" className="w-full justify-between bg-zinc-950/50 border border-zinc-800/50 text-zinc-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all duration-300 h-12">
                <div className="flex items-center">
                  <Home className="mr-3 h-4 w-4" /> Manajemen Shelter
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </Button>
            </Link>
            <Link href="/admin/facilities" className="block group">
              <Button variant="ghost" className="w-full justify-between bg-zinc-950/50 border border-zinc-800/50 text-zinc-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all duration-300 h-12">
                <div className="flex items-center">
                  <Building className="mr-3 h-4 w-4" /> Layanan Fasilitas
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </Button>
            </Link>
            <Link href="/admin/routes" className="block group">
              <Button variant="ghost" className="w-full justify-between bg-zinc-950/50 border border-zinc-800/50 text-zinc-300 hover:bg-purple-600 hover:text-white hover:border-purple-500 transition-all duration-300 h-12">
                <div className="flex items-center">
                  <Compass className="mr-3 h-4 w-4" /> Jalur Evakuasi
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

        {/* Map Placeholder Panel */}
        <Card className="md:col-span-2 border border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/50 pb-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Map className="h-5 w-5 text-emerald-500" />
              Distribusi Pemetaan Spasial
            </CardTitle>
            <CardDescription className="text-zinc-400">Ringkasan geospasial titik rawan dan evakuasi</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative min-h-[300px] bg-zinc-950/50">
            {/* Elegant placeholder pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 z-10">
               <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-2xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                 <Map className="w-8 h-8 text-blue-500/50" />
               </div>
               <p className="font-medium text-zinc-400">Statistik Peta Interaktif</p>
               <p className="text-sm mt-1 max-w-sm text-center">Fitur visualisasi ringkasan pemetaan admin akan dimuat di area ini.</p>
               <Button variant="outline" className="mt-4 border-zinc-800 hover:bg-zinc-800 bg-zinc-900">Muat Peta <Activity className="w-4 h-4 ml-2"/></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}