"use client";

import { useEffect, useState } from "react";
import { roadApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapIcon, Plus, Filter, Route, AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Road, RoadType, RoadCondition, RoadVulnerability } from "@/types";

const roadTypeLabels: Record<string, string> = {
  NATIONAL: "Nasional",
  PROVINCIAL: "Provinsi",
  REGIONAL: "Wilayah",
  LOCAL: "Lokal",
};

const roadConditionLabels: Record<string, string> = {
  GOOD: "Baik",
  MODERATE: "Sedang",
  POOR: "Buruk",
  DAMAGED: "Rusak",
};

const vulnerabilityLabels: Record<string, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
};

const conditionColors: Record<string, string> = {
  GOOD: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MODERATE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  POOR: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DAMAGED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const vulnerabilityColors: Record<string, string> = {
  LOW: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<Road[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Road | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    name: "",
    type: "LOCAL" as RoadType,
    condition: "GOOD" as RoadCondition,
    vulnerability: "LOW" as RoadVulnerability,
    length: 0,
  });

  const fetchRoutes = async (page = 1) => {
    setLoading(true);
    try {
      const resp = await roadApi.getAll({
        page,
        limit: 20,
        type: filterType !== "all" ? filterType : undefined,
      });
      setRoutes(resp.data);
      setTotalPages(resp.meta.totalPages || 1);
      setTotalItems(resp.meta.total || 0);
      setCurrentPage(resp.meta.page || 1);
    } catch (error) {
      toast.error("Gagal memuat data jalur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes(1);
  }, [filterType]);

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        geometry: {
          type: "LineString",
          coordinates: [[110.28, -7.85], [110.35, -7.92]],
        },
      };

      if (editingRoute) {
        await roadApi.update(editingRoute.id, payload);
        toast.success("Jalur berhasil diperbarui");
      } else {
        await roadApi.create(payload);
        toast.success("Jalur berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchRoutes(currentPage);
      resetForm();
    } catch (error) {
      toast.error("Gagal menyimpan jalur");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jalur ini?")) return;
    try {
      await roadApi.delete(id);
      toast.success("Jalur berhasil dihapus");
      fetchRoutes(currentPage);
    } catch (error) {
      toast.error("Gagal menghapus jalur");
    }
  };

  const handleEdit = (route: Road) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      type: route.type,
      condition: route.condition,
      vulnerability: route.vulnerability,
      length: route.length || 0,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRoute(null);
    setFormData({
      name: "",
      type: "LOCAL" as RoadType,
      condition: "GOOD" as RoadCondition,
      vulnerability: "LOW" as RoadVulnerability,
      length: 0,
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="py-6 w-full px-4 sm:px-6 md:px-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Route className="h-6 w-6 text-blue-500" />
            Jalur Evakuasi
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Total {totalItems} ruas jalan terdaftar dalam sistem peta evakuasi.
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
          <Plus className="w-4 h-4 mr-2" /> Tambah Jalur
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Filter className="w-5 h-5 text-blue-400" />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v || "all")}>
            <SelectTrigger className="w-full sm:w-[200px] h-10 bg-zinc-950 border-zinc-800 text-zinc-200">
              <SelectValue placeholder="Semua Jenis Jalan" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="NATIONAL">Nasional</SelectItem>
              <SelectItem value="PROVINCIAL">Provinsi</SelectItem>
              <SelectItem value="REGIONAL">Wilayah</SelectItem>
              <SelectItem value="LOCAL">Lokal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {loading && <div className="text-sm text-zinc-500 animate-pulse">Memuat data...</div>}
      </div>

      {/* Data Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                <TableHead className="font-semibold text-zinc-400">Nama Jalan</TableHead>
                <TableHead className="font-semibold text-zinc-400">Jenis</TableHead>
                <TableHead className="font-semibold text-zinc-400">Kondisi Fisik</TableHead>
                <TableHead className="font-semibold text-zinc-400">Kerentanan Relatif</TableHead>
                <TableHead className="font-semibold text-zinc-400 text-right">L (m)</TableHead>
                <TableHead className="font-semibold text-zinc-400 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      Sedang memuat data spasial...
                    </div>
                  </TableCell>
                </TableRow>
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                    <MapIcon className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Tidak ada jalur evakuasi yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((route) => (
                  <TableRow key={route.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <TableCell className="font-medium text-zinc-200">
                      {route.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-zinc-800 font-normal border-zinc-700 text-zinc-300">
                        {roadTypeLabels[route.type] || route.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={conditionColors[route.condition]}>
                        {roadConditionLabels[route.condition] || route.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={vulnerabilityColors[route.vulnerability]}>
                        {vulnerabilityLabels[route.vulnerability] || route.vulnerability}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-zinc-400 font-mono text-sm">
                      {route.length ? Math.round(route.length).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(route)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(route.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="border-t border-zinc-800 bg-zinc-950/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              Menampilkan <span className="font-medium text-zinc-300">{routes.length}</span> baris di halaman {currentPage}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRoutes(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <div className="flex items-center justify-center min-w-[2rem] text-sm font-medium text-zinc-400">
                {currentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRoutes(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-900 text-zinc-100 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingRoute ? "Edit Jalur" : "Tambah Jalur"}
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {editingRoute
                ? "Perbarui metadata jalur evakuasi terpilih"
                : "Tambahkan ruas jalur evakuasi baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-400">Nama Jalan</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Cth: Jl. Parangtritis Km 5"
                className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-zinc-400">Tipe Jalan Terklasifikasi</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: (value || "LOCAL") as RoadType })
                }
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="NATIONAL">Tingkat Nasional</SelectItem>
                  <SelectItem value="PROVINCIAL">Tingkat Provinsi</SelectItem>
                  <SelectItem value="REGIONAL">Tingkat Wilayah / Kabupaten</SelectItem>
                  <SelectItem value="LOCAL">Jalan Lokal / Gang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="condition" className="text-zinc-400">Kondisi Fisik</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) =>
                    setFormData({ ...formData, condition: value as RoadCondition })
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="GOOD">Sangat Baik</SelectItem>
                    <SelectItem value="MODERATE">Sedang (Layak)</SelectItem>
                    <SelectItem value="POOR">Kondisi Buruk</SelectItem>
                    <SelectItem value="DAMAGED">Rusak Berat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vulnerability" className="text-zinc-400">Kerentanan Bencana</Label>
                <Select
                  value={formData.vulnerability}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vulnerability: value as RoadVulnerability })
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="LOW">Aman (Rendah)</SelectItem>
                    <SelectItem value="MEDIUM">Waspada (Sedang)</SelectItem>
                    <SelectItem value="HIGH">Bahaya (Tinggi)</SelectItem>
                    <SelectItem value="CRITICAL">Zona Kritis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="length" className="text-zinc-400">Estimasi Panjang (Meter)</Label>
              <Input
                id="length"
                type="number"
                value={formData.length}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    length: parseFloat(e.target.value) || 0,
                  })
                }
                className="bg-zinc-950 border-zinc-800"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="hover:bg-zinc-800 hover:text-zinc-100">
              Batalkan
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
              {editingRoute ? "Simpan Perubahan" : "Terbitkan Jalur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}