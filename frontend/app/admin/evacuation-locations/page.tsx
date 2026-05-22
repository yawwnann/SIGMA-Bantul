"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { evacuationLocationApi, officerApi, type Officer } from "@/api";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Home, Plus, MapPin, Users, UserCheck, UserX } from "lucide-react";
import type { EvacuationLocation, EvacuationLocationCondition } from "@/types";

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] bg-zinc-950 rounded-lg animate-pulse" />
    ),
  },
);

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

export default function AdminEvacuationLocationsPage() {
  const [evacuationLocations, setEvacuationLocations] = useState<EvacuationLocation[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingEvacuationLocation, setEditingEvacuationLocation] = useState<EvacuationLocation | null>(null);
  const [assigningEvacuationLocation, setAssigningEvacuationLocation] = useState<EvacuationLocation | null>(
    null,
  );
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    capacity: 0,
    condition: "GOOD" as EvacuationLocationCondition,
    lat: -7.888,
    lon: 110.33,
  });

  const fetchData = async () => {
    try {
      const [evacuationLocationData, officerData] = await Promise.all([
        evacuationLocationApi.getAll(),
        officerApi.getAll(),
      ]);
      setEvacuationLocations(evacuationLocationData);
      setOfficers(officerData);
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        capacity: formData.capacity,
        condition: formData.condition,
        geometry: {
          type: "Point",
          coordinates: [formData.lon, formData.lat],
        },
      };

      if (editingEvacuationLocation) {
        await evacuationLocationApi.update(editingEvacuationLocation.id, payload);
        toast.success("Lokasi Evakuasi berhasil diperbarui");
      } else {
        await evacuationLocationApi.create(payload);
        toast.success("Lokasi Evakuasi berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error("Gagal menyimpan lokasi evakuasi");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus lokasi evakuasi ini?")) return;
    try {
      await evacuationLocationApi.delete(id);
      toast.success("Lokasi Evakuasi berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus lokasi evakuasi");
    }
  };

  const handleEdit = (evacuationLocation: EvacuationLocation) => {
    setEditingEvacuationLocation(evacuationLocation);
    const coords = (evacuationLocation.geometry as { coordinates?: [number, number] })
      ?.coordinates;
    setFormData({
      name: evacuationLocation.name,
      address: evacuationLocation.address || "",
      capacity: evacuationLocation.capacity,
      condition: evacuationLocation.condition,
      lat: coords?.[1] || -7.888,
      lon: coords?.[0] || 110.33,
    });
    setIsDialogOpen(true);
  };

  const handleOpenAssign = (evacuationLocation: EvacuationLocation) => {
    setAssigningEvacuationLocation(evacuationLocation);
    setSelectedOfficerId(evacuationLocation.officerId?.toString() || "none");
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assigningEvacuationLocation) return;
    try {
      if (selectedOfficerId && selectedOfficerId !== "none") {
        await evacuationLocationApi.assignOfficer(
          assigningEvacuationLocation.id,
          parseInt(selectedOfficerId),
        );
        toast.success("Petugas berhasil ditugaskan");
      } else {
        await evacuationLocationApi.unassignOfficer(assigningEvacuationLocation.id);
        toast.success("Petugas berhasil dilepas dari lokasi evakuasi");
      }
      setIsAssignDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal mengubah penugasan");
    }
  };

  const resetForm = () => {
    setEditingEvacuationLocation(null);
    setFormData({
      name: "",
      address: "",
      capacity: 0,
      condition: "GOOD" as EvacuationLocationCondition,
      lat: -7.888,
      lon: 110.33,
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="py-6 w-full px-4 sm:px-6 md:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-500" />
            Manajemen Lokasi Evakuasi
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Total {evacuationLocations.length} titik pengungsian terdaftar dalam pangkalan
            data.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Tambah Lokasi Evakuasi
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total EvacuationLocations */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-blue-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Home className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Total Lokasi Evakuasi
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {evacuationLocations.length}
          </div>
          <p className="text-xs text-zinc-500">Titik pengungsian</p>
        </div>

        {/* Total Capacity */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-emerald-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Kapasitas Total
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {evacuationLocations.reduce((sum, s) => sum + s.capacity, 0).toLocaleString()}
          </div>
          <p className="text-xs text-zinc-500">Orang</p>
        </div>

        {/* Assigned Officers */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-amber-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <UserCheck className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Berpetugas
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {evacuationLocations.filter((s) => s.officerId).length}
          </div>
          <p className="text-xs text-zinc-500">Lokasi evakuasi dengan petugas</p>
        </div>

        {/* Unassigned */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-red-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Belum Berpetugas
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {evacuationLocations.filter((s) => !s.officerId).length}
          </div>
          <p className="text-xs text-zinc-500">Perlu penugasan</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                <TableHead className="font-semibold text-zinc-400">
                  Nama Lokasi Evakuasi
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Alamat
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Daya Tampung
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Kondisi
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Petugas
                </TableHead>
                <TableHead className="font-semibold text-zinc-400 text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-zinc-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      Sinkronisasi pangkalan data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : evacuationLocations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-zinc-500"
                  >
                    <Home className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Tidak ada data lokasi evakuasi yang dikelola.
                  </TableCell>
                </TableRow>
              ) : (
                evacuationLocations.map((evacuationLocation) => (
                  <TableRow
                    key={evacuationLocation.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                  >
                    <TableCell className="font-medium text-zinc-200">
                      {evacuationLocation.name}
                    </TableCell>
                    <TableCell className="text-zinc-400 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span
                          className="truncate block"
                          title={evacuationLocation.address || "Area Tidak Diketahui"}
                        >
                          {evacuationLocation.address || "Area Tidak Diketahui"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 font-medium border-zinc-700 text-zinc-300"
                      >
                        <Users className="w-3 h-3 mr-1 opacity-50" />
                        {evacuationLocation.capacity.toLocaleString()} Jiwa
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={conditionColors[evacuationLocation.condition]}>
                        {conditionLabels[evacuationLocation.condition] ||
                          evacuationLocation.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {evacuationLocation.officer ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                          <UserCheck className="h-3.5 w-3.5 shrink-0" />
                          {evacuationLocation.officer.name}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-sm italic">
                          Belum ditugaskan
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAssign(evacuationLocation)}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Tugaskan
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(evacuationLocation)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(evacuationLocation.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Assign Officer Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-900 text-zinc-100 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              Tugaskan Petugas
            </DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2">
              Pilih petugas yang akan bertanggung jawab mengelola lokasi evakuasi{" "}
              <span className="text-white font-medium">
                {assigningEvacuationLocation?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium text-zinc-300 mb-2 block">
                Petugas Lokasi Evakuasi
              </Label>
              <Select
                value={selectedOfficerId}
                onValueChange={(value) => setSelectedOfficerId(value || "")}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-700 h-11 text-zinc-100">
                  <SelectValue placeholder="Pilih petugas...">
                    {selectedOfficerId === "none" ? (
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-400">Tidak ada petugas</span>
                      </div>
                    ) : selectedOfficerId ? (
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                        <span>
                          {officers.find(
                            (o) => o.id.toString() === selectedOfficerId,
                          )?.name || "Pilih petugas..."}
                        </span>
                      </div>
                    ) : (
                      "Pilih petugas..."
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[300px]">
                  <SelectItem value="none">
                    <div className="flex items-center gap-2 py-1">
                      <UserX className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-400">
                        Tidak ada petugas (kosongkan)
                      </span>
                    </div>
                  </SelectItem>
                  {officers.length === 0 ? (
                    <div className="px-2 py-6 text-center text-zinc-500 text-sm">
                      Belum ada petugas terdaftar
                    </div>
                  ) : (
                    officers.map((officer) => (
                      <SelectItem
                        key={officer.id}
                        value={officer.id.toString()}
                      >
                        <div className="flex items-start gap-2 py-1">
                          <UserCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-zinc-100">
                              {officer.name}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                              {officer.email}
                            </div>
                            {officer.managedEvacuationLocations &&
                              officer.managedEvacuationLocations.length > 0 && (
                                <div className="text-xs text-amber-500 mt-0.5">
                                  Mengelola {officer.managedEvacuationLocations.length}{" "}
                                  evacuationLocation
                                </div>
                              )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Info Box */}
            {selectedOfficerId && selectedOfficerId !== "none" && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-emerald-400">
                    Petugas akan dapat mengakses dan mengelola evacuationLocation ini
                    melalui dashboard mereka
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsAssignDialogOpen(false)}
              className="hover:bg-zinc-800 hover:text-zinc-100"
            >
              Batal
            </Button>
            <Button
              onClick={handleAssign}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Simpan Penugasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit EvacuationLocation Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setIsDialogOpen(false);
              resetForm();
            }}
          />

          {/* Dialog */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-zinc-800 p-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Home className="w-6 h-6 text-blue-500" />
                {editingEvacuationLocation ? "Perbarui Lokasi Evakuasi" : "Tambah Lokasi Evakuasi Baru"}
              </h2>
              <p className="text-zinc-400 text-sm mt-2">
                {editingEvacuationLocation
                  ? "Perbarui informasi lokasi evakuasi yang sudah terdaftar"
                  : "Masukkan data logistik untuk penambahan situs bantuan/pengungsian."}
              </p>
            </div>

            {/* Content - 2 Column Layout */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Form Fields */}
              <div className="space-y-5">
                {/* Nama EvacuationLocation */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                  >
                    <Home className="w-4 h-4 text-blue-400" />
                    Nama Lokasi Evakuasi Utama
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Contoh: Balai Desa Bantul"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-zinc-500">
                    Nama resmi lokasi evakuasi yang mudah dikenali
                  </p>
                </div>

                {/* Alamat */}
                <div className="space-y-2">
                  <label
                    htmlFor="address"
                    className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Informasi Alamat
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Contoh: Jl. Dr. Wahidin Sudiro Kusumo No.3"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-zinc-500">
                    Alamat lengkap untuk memudahkan navigasi
                  </p>
                </div>

                {/* Kapasitas */}
                <div className="space-y-2">
                  <label
                    htmlFor="capacity"
                    className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                  >
                    <Users className="w-4 h-4 text-amber-400" />
                    Estimasi Kapasitas
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-zinc-500">
                    Jumlah maksimal pengungsi (orang)
                  </p>
                </div>

                {/* Kondisi */}
                <div className="space-y-2">
                  <label
                    htmlFor="condition"
                    className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                  >
                    <Home className="w-4 h-4 text-purple-400" />
                    Kelayakhunian
                  </label>
                  <select
                    id="condition"
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        condition: e.target.value as EvacuationLocationCondition,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="GOOD">Sangat Baik</option>
                    <option value="MODERATE">Layak Huni</option>
                    <option value="NEEDS_REPAIR">Butuh Rehab</option>
                    <option value="DAMAGED">Rusak Berat</option>
                  </select>
                  <p className="text-xs text-zinc-500">
                    Status kondisi bangunan lokasi evakuasi
                  </p>
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="lat"
                      className="text-xs font-medium text-zinc-400 uppercase tracking-wider"
                    >
                      Garis Lintang (Lat)
                    </label>
                    <input
                      id="lat"
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lat: parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="lon"
                      className="text-xs font-medium text-zinc-400 uppercase tracking-wider"
                    >
                      Garis Bujur (Lon)
                    </label>
                    <input
                      id="lon"
                      type="number"
                      step="any"
                      value={formData.lon}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lon: parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-blue-500/20 rounded">
                      <svg
                        className="w-4 h-4 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-blue-300 font-medium mb-1">
                        Informasi Penting
                      </p>
                      <p className="text-xs text-blue-400/80">
                        Pastikan lokasi yang dipilih akurat dan mudah diakses
                        oleh pengungsi. Data ini akan ditampilkan di peta
                        publik.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Map */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-400" />
                    Tandai Lokasi di Peta
                    <span className="text-red-400">*</span>
                  </label>
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">
                    Interaktif
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Klik pada peta atau seret penanda untuk memilih koordinat
                  lokasi evakuasi
                </p>
                <div className="rounded-lg overflow-hidden border border-zinc-800 h-auto">
                  <LocationPickerMap
                    lat={formData.lat}
                    lon={formData.lon}
                    onChange={(lat, lon) =>
                      setFormData((prev) => ({ ...prev, lat, lon }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || formData.capacity <= 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                {editingEvacuationLocation ? "Simpan Perubahan" : "Simpan Lokasi Evakuasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
