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
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/30 via-emerald-800/20 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-5 md:p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="relative flex items-start md:items-center gap-3 md:gap-4">
          <div className="p-2.5 md:p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex-shrink-0">
            <Building2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1 truncate">
              Selamat Datang, {dashboard.officer.name}
            </h1>
            <p className="text-sm md:text-base text-gray-400">
              Kelola shelter evakuasi yang menjadi tanggung jawab Anda
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg flex-shrink-0">
                <Home className="w-4 h-4 text-emerald-400" />
              </div>
              Total Shelter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {stats.totalShelters}
            </div>
            <p className="text-xs text-gray-500 mt-1">Shelter yang dikelola</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 hover:border-blue-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              Kapasitas Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {stats.totalCapacity.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Orang</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 hover:border-amber-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              Tingkat Hunian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {occupancyPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalOccupancy.toLocaleString()} /{" "}
              {stats.totalCapacity.toLocaleString()} orang
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shelter List */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg md:text-xl font-bold text-white">
          Shelter yang Dikelola
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          className="bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
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
}

function ShelterCard({
  shelter,
  updating,
  onUpdateOccupancy,
  onUpdateCondition,
}: ShelterCardProps) {
  const [occupancy, setOccupancy] = useState(shelter.currentOccupancy);
  const [condition, setCondition] = useState(shelter.condition);

  const occupancyPercentage = (occupancy / shelter.capacity) * 100;
  const hasChanges =
    occupancy !== shelter.currentOccupancy || condition !== shelter.condition;

  const handleSave = () => {
    if (occupancy !== shelter.currentOccupancy) {
      onUpdateOccupancy(shelter.id, occupancy);
    }
    if (condition !== shelter.condition) {
      onUpdateCondition(shelter.id, condition);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg font-bold text-white mb-1.5 truncate">
              {shelter.name}
            </CardTitle>
            <div className="flex items-start gap-1.5 text-xs md:text-sm text-gray-400">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                {shelter.address || "Lokasi tidak tersedia"}
              </span>
            </div>
          </div>
          <Badge
            className={`${conditionColors[condition]} flex-shrink-0 text-xs`}
          >
            {conditionLabels[condition] || condition}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Occupancy Progress */}
        <div className="bg-gray-950/50 rounded-lg p-3.5 border border-gray-800">
          <div className="flex items-center justify-between text-xs md:text-sm mb-2.5">
            <span className="text-gray-400 font-medium">Tingkat Hunian</span>
            <span className="text-white font-semibold tabular-nums">
              {occupancy} / {shelter.capacity} ({occupancyPercentage.toFixed(0)}
              %)
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                occupancyPercentage > 90
                  ? "bg-gradient-to-r from-red-600 to-red-500"
                  : occupancyPercentage > 70
                    ? "bg-gradient-to-r from-amber-600 to-amber-500"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-500"
              }`}
              style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Update Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-400 mb-1.5 block font-medium">
              Jumlah Penghuni
            </Label>
            <Input
              type="number"
              value={occupancy}
              onChange={(e) => setOccupancy(parseInt(e.target.value) || 0)}
              className="bg-gray-950 border-gray-700 hover:border-gray-600 focus:border-emerald-600 h-9 text-sm transition-colors"
              min={0}
              max={shelter.capacity}
              disabled={updating}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400 mb-1.5 block font-medium">
              Kondisi Shelter
            </Label>
            <Select
              value={condition}
              onValueChange={setCondition}
              disabled={updating}
            >
              <SelectTrigger className="bg-gray-950 border-gray-700 hover:border-gray-600 h-9 text-sm transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                <SelectItem value="GOOD">Baik</SelectItem>
                <SelectItem value="MODERATE">Sedang</SelectItem>
                <SelectItem value="NEEDS_REPAIR">Perlu Perbaikan</SelectItem>
                <SelectItem value="DAMAGED">Rusak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={updating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all h-10 font-medium"
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
