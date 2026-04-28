"use client";

import { useEffect, useState } from "react";
import { officerApi, type DashboardResponse } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Home,
  Users,
  MapPin,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Building2,
  Loader2,
} from "lucide-react";

const conditionColors: Record<string, string> = {
  GOOD: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MODERATE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  NEEDS_REPAIR: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DAMAGED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const conditionLabels: Record<string, string> = {
  GOOD: "Baik",
  MODERATE: "Sedang",
  NEEDS_REPAIR: "Perlu Perbaikan",
  DAMAGED: "Rusak",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktif",
  STANDBY: "Siaga",
  UNAVAILABLE: "Tidak Tersedia",
};

export default function OfficerDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchDashboard = async () => {
    try {
      const data = await officerApi.getDashboard();
      setDashboard(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleUpdateOccupancy = async (
    shelterId: number,
    occupancy: number,
  ) => {
    setUpdating(shelterId);
    try {
      await officerApi.updateOccupancy(shelterId, occupancy);
      toast.success("Jumlah penghuni berhasil diperbarui");
      fetchDashboard();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Gagal memperbarui jumlah penghuni",
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateCondition = async (
    shelterId: number,
    condition: string,
  ) => {
    setUpdating(shelterId);
    try {
      await officerApi.updateCondition(shelterId, condition);
      toast.success("Kondisi shelter berhasil diperbarui");
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memperbarui kondisi");
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateStatus = async (shelterId: number, status: string) => {
    setUpdating(shelterId);
    try {
      await officerApi.updateStatus(shelterId, status);
      toast.success("Status operasional berhasil diperbarui");
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memperbarui status");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-gray-400 text-sm">Memuat dashboard...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
        <p>Gagal memuat data dashboard</p>
      </div>
    );
  }

  const stats = dashboard.statistics;
  const occupancyPercentage =
    stats.totalCapacity > 0
      ? (stats.totalOccupancy / stats.totalCapacity) * 100
      : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/60 via-emerald-800/30 to-transparent border border-emerald-500/20 shadow-2xl shadow-emerald-900/20 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute -bottom-10 left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl opacity-50" />
        <div className="relative flex items-start md:items-center gap-4 md:gap-6">
          <div className="p-3 md:p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex-shrink-0 shadow-inner">
            <Building2 className="w-8 h-8 md:w-10 md:h-10 text-emerald-400 drop-shadow-md" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1.5 tracking-tight drop-shadow-sm">
              Selamat Datang, {dashboard.officer.name}
            </h1>
            <p className="text-sm md:text-base text-gray-300 font-medium tracking-wide">
              Kelola shelter evakuasi yang menjadi tanggung jawab Anda secara real-time
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card className="relative overflow-hidden bg-gray-900/40 backdrop-blur-xl border border-gray-800 hover:border-emerald-500/30 group hover:-translate-y-1 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 rounded-2xl">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-xl flex-shrink-0 border border-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <Home className="w-4 h-4 text-emerald-400" />
              </div>
              Total Shelter
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {stats.totalShelters}
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">Shelter yang dikelola</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gray-900/40 backdrop-blur-xl border border-gray-800 hover:border-blue-500/30 group hover:-translate-y-1 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 rounded-2xl">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0 border border-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              Kapasitas Total
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {stats.totalCapacity.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">Orang (Maksimal)</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gray-900/40 backdrop-blur-xl border border-gray-800 hover:border-amber-500/30 group hover:-translate-y-1 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 rounded-2xl">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 rounded-xl flex-shrink-0 border border-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              Tingkat Hunian
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {occupancyPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              {stats.totalOccupancy.toLocaleString()} /{" "}
              {stats.totalCapacity.toLocaleString()} terisi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shelter List */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          Shelter yang Dikelola
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          className="bg-gray-900/50 backdrop-blur-sm border-gray-800 text-gray-300 hover:bg-gray-800 hover:text-white transition-all rounded-xl shadow-sm hover:shadow-md"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Perbarui Data
        </Button>
      </div>

      {dashboard.shelters.length === 0 ? (
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardContent className="py-16 text-center">
            <div className="p-4 bg-gray-800/50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Home className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg font-medium mb-2">
              Belum Ada Shelter
            </p>
            <p className="text-gray-500 text-sm">
              Belum ada shelter yang ditugaskan kepada Anda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {dashboard.shelters.map((shelter) => (
            <ShelterCard
              key={shelter.id}
              shelter={shelter}
              updating={updating === shelter.id}
              onUpdateOccupancy={handleUpdateOccupancy}
              onUpdateCondition={handleUpdateCondition}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ShelterCardProps {
  shelter: any;
  updating: boolean;
  onUpdateOccupancy: (shelterId: number, occupancy: number) => void;
  onUpdateCondition: (shelterId: number, condition: string) => void;
  onUpdateStatus: (shelterId: number, status: string) => void;
}

function ShelterCard({
  shelter,
  updating,
  onUpdateOccupancy,
  onUpdateCondition,
  onUpdateStatus,
}: ShelterCardProps) {
  const [occupancy, setOccupancy] = useState<number | "">(shelter.currentOccupancy);
  const [condition, setCondition] = useState(shelter.condition);
  const [status, setStatus] = useState(shelter.status || "ACTIVE");

  const parsedOccupancy = typeof occupancy === "number" ? occupancy : 0;
  const occupancyPercentage = (parsedOccupancy / shelter.capacity) * 100;
  const hasChanges =
    parsedOccupancy !== shelter.currentOccupancy ||
    condition !== shelter.condition ||
    status !== shelter.status;

  const handleSave = () => {
    if (parsedOccupancy !== shelter.currentOccupancy) {
      onUpdateOccupancy(shelter.id, parsedOccupancy);
    }
    if (condition !== shelter.condition) {
      onUpdateCondition(shelter.id, condition);
    }
    if (status !== shelter.status && status) {
      onUpdateStatus(shelter.id, status);
    }
  };

  return (
    <Card className="group relative bg-gray-950/40 backdrop-blur-xl border border-gray-800/80 hover:border-emerald-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/5 overflow-hidden rounded-2xl">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 group-hover:via-emerald-500/30 to-transparent transition-all duration-500" />
      <CardHeader className="pb-5 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg font-bold text-white mb-1.5 truncate tracking-tight">
              {shelter.name}
            </CardTitle>
            <div className="flex items-start gap-1.5 text-xs md:text-sm text-gray-400 font-medium">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-400" />
              <span className="line-clamp-2">
                {shelter.address || "Lokasi tidak tersedia"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <Badge
              className={`${conditionColors[condition]} flex-shrink-0 text-[11px] px-2.5 py-0.5 font-bold tracking-wide rounded-md border backdrop-blur-sm shadow-sm`}
            >
              {conditionLabels[condition] || condition}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold tracking-wider bg-gray-900/50 text-gray-300 border-gray-700/80 px-2 py-0.5 rounded-md shadow-inner"
            >
              {statusLabels[status] || status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0 relative z-10">
        {/* Occupancy Progress */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 shadow-inner backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs md:text-sm mb-3">
            <span className="text-gray-400 font-medium tracking-wide">Tingkat Hunian</span>
            <span className="text-white font-bold tabular-nums bg-white/10 px-2.5 py-0.5 rounded-md text-xs">
              {parsedOccupancy} / {shelter.capacity} ({occupancyPercentage.toFixed(0)}%)
            </span>
          </div>
          <div className="w-full bg-gray-800/80 rounded-full h-3 overflow-hidden shadow-inner flex">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)] ${
                occupancyPercentage > 90
                  ? "bg-gradient-to-r from-red-600 to-red-400"
                  : occupancyPercentage > 70
                    ? "bg-gradient-to-r from-amber-600 to-amber-400"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-400"
              }`}
              style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Update Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 block font-bold">
              Penghuni Saat Ini
            </Label>
            <Input
              type="number"
              value={occupancy}
              onChange={(e) => {
                const val = e.target.value;
                setOccupancy(val === "" ? "" : parseInt(val, 10));
              }}
              className="bg-gray-950/50 border-gray-800 hover:border-gray-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 h-10 text-sm font-medium transition-all rounded-lg shadow-inner text-white"
              min={0}
              max={shelter.capacity}
              disabled={updating}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 block font-bold">
              Kondisi Shelter
            </Label>
            <Select
              value={condition}
              onValueChange={setCondition}
              disabled={updating}
            >
              <SelectTrigger className="bg-gray-950/50 border-gray-800 hover:border-gray-700 focus:border-emerald-500/50 h-10 text-sm font-medium transition-all rounded-lg shadow-inner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-800 rounded-xl shadow-xl text-gray-200">
                <SelectItem value="GOOD" className="focus:bg-gray-800 focus:text-white">Baik</SelectItem>
                <SelectItem value="MODERATE" className="focus:bg-gray-800 focus:text-white">Sedang</SelectItem>
                <SelectItem value="NEEDS_REPAIR" className="focus:bg-gray-800 focus:text-white">Perlu Perbaikan</SelectItem>
                <SelectItem value="DAMAGED" className="focus:bg-gray-800 focus:text-white">Rusak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 block font-bold">
              Status Operasional
            </Label>
            <Select
              value={status}
              onValueChange={setStatus}
              disabled={updating}
            >
              <SelectTrigger className="bg-gray-950/50 border-gray-800 hover:border-gray-700 focus:border-emerald-500/50 h-10 text-sm font-medium transition-all rounded-lg shadow-inner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-gray-800 rounded-xl shadow-xl text-gray-200">
                <SelectItem value="ACTIVE" className="focus:bg-gray-800 focus:text-white">Aktif (Menerima Pengungsi)</SelectItem>
                <SelectItem value="STANDBY" className="focus:bg-gray-800 focus:text-white">Siaga (Persiapan)</SelectItem>
                <SelectItem value="UNAVAILABLE" className="focus:bg-gray-800 focus:text-white">Tidak Tersedia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={updating}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_0_20px_rgb(16,185,129,0.3)] hover:shadow-[0_0_25px_rgb(16,185,129,0.5)] border border-emerald-400/20 transition-all duration-300 h-11 font-bold rounded-xl mt-2 animate-in fade-in slide-in-from-bottom-2"
          >
            {updating ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Menyimpan Perubahan...
              </>
            ) : (
              "Simpan Konfigurasi"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
