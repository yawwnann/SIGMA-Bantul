"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { shelterApi, officerApi, type Officer } from "@/api";
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
import { Home, Plus, MapPin, Users, UserCheck, UserX } from "lucide-react";
import type { Shelter, ShelterCondition } from "@/types";

const LocationPickerMap = dynamic(
  () => import("@/components/map/location-picker-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] bg-gray-950 rounded-lg animate-pulse" />
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

export default function AdminSheltersPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingShelter, setEditingShelter] = useState<Shelter | null>(null);
  const [assigningShelter, setAssigningShelter] = useState<Shelter | null>(
    null,
  );
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    capacity: 0,
    condition: "GOOD" as ShelterCondition,
    lat: -7.888,
    lon: 110.33,
  });

  const fetchData = async () => {
    try {
      const [shelterData, officerData] = await Promise.all([
        shelterApi.getAll(),
        officerApi.getAll(),
      ]);
      setShelters(shelterData);
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

      if (editingShelter) {
        await shelterApi.update(editingShelter.id, payload);
        toast.success("Shelter berhasil diperbarui");
      } else {
        await shelterApi.create(payload);
        toast.success("Shelter berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error("Gagal menyimpan shelter");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus shelter ini?")) return;
    try {
      await shelterApi.delete(id);
      toast.success("Shelter berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus shelter");
    }
  };

  const handleEdit = (shelter: Shelter) => {
    setEditingShelter(shelter);
    const coords = (shelter.geometry as { coordinates?: [number, number] })
      ?.coordinates;
    setFormData({
      name: shelter.name,
      address: shelter.address || "",
      capacity: shelter.capacity,
      condition: shelter.condition,
      lat: coords?.[1] || -7.888,
      lon: coords?.[0] || 110.33,
    });
    setIsDialogOpen(true);
  };

  const handleOpenAssign = (shelter: Shelter) => {
    setAssigningShelter(shelter);
    setSelectedOfficerId(shelter.officerId?.toString() || "none");
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assigningShelter) return;
    try {
      if (selectedOfficerId && selectedOfficerId !== "none") {
        await shelterApi.assignOfficer(
          assigningShelter.id,
          parseInt(selectedOfficerId),
        );
        toast.success("Petugas berhasil ditugaskan");
      } else {
        await shelterApi.unassignOfficer(assigningShelter.id);
        toast.success("Petugas berhasil dilepas dari shelter");
      }
      setIsAssignDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal mengubah penugasan");
    }
  };

  const resetForm = () => {
    setEditingShelter(null);
    setFormData({
      name: "",
      address: "",
      capacity: 0,
      condition: "GOOD" as ShelterCondition,
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
            Manajemen Shelter Evakuasi
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            Total {shelters.length} titik pengungsian terdaftar dalam pangkalan
            data.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Tambah Shelter
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shelters */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-blue-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Home className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Shelter
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {shelters.length}
          </div>
          <p className="text-xs text-gray-500">Titik pengungsian</p>
        </div>

        {/* Total Capacity */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-emerald-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kapasitas Total
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {shelters.reduce((sum, s) => sum + s.capacity, 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-500">Orang</p>
        </div>

        {/* Assigned Officers */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-amber-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <UserCheck className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Berpetugas
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {shelters.filter((s) => s.officerId).length}
          </div>
          <p className="text-xs text-gray-500">Shelter dengan petugas</p>
        </div>

        {/* Unassigned */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-red-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Belum Berpetugas
            </span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {shelters.filter((s) => !s.officerId).length}
          </div>
          <p className="text-xs text-gray-500">Perlu penugasan</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-950/50">
              <TableRow className="border-b border-gray-800 hover:bg-transparent">
                <TableHead className="font-semibold text-gray-400">
                  Nama Shelter
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Alamat
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Daya Tampung
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Kondisi
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Petugas
                </TableHead>
                <TableHead className="font-semibold text-gray-400 text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      Sinkronisasi pangkalan data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : shelters.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    <Home className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Tidak ada data shelter yang dikelola.
                  </TableCell>
                </TableRow>
              ) : (
                shelters.map((shelter) => (
                  <TableRow
                    key={shelter.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-200">
                      {shelter.name}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {shelter.address || "Area Tidak Diketahui"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-gray-800 font-medium border-gray-700 text-gray-300"
                      >
                        <Users className="w-3 h-3 mr-1 opacity-50" />
                        {shelter.capacity.toLocaleString()} Jiwa
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={conditionColors[shelter.condition]}>
                        {conditionLabels[shelter.condition] ||
                          shelter.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {shelter.officer ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                          <UserCheck className="h-3.5 w-3.5 shrink-0" />
                          {shelter.officer.name}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-sm italic">
                          Belum ditugaskan
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAssign(shelter)}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Tugaskan
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(shelter)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(shelter.id)}
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
        <DialogContent className="max-w-md bg-gray-900 text-gray-100 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              Tugaskan Petugas
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              Pilih petugas yang akan bertanggung jawab mengelola shelter{" "}
              <span className="text-white font-medium">
                {assigningShelter?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-300 mb-2 block">
                Petugas Shelter
              </Label>
              <Select
                value={selectedOfficerId}
                onValueChange={(value) => setSelectedOfficerId(value || "")}
              >
                <SelectTrigger className="bg-gray-950 border-gray-700 h-11 text-gray-100">
                  <SelectValue placeholder="Pilih petugas...">
                    {selectedOfficerId === "none" ? (
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400">Tidak ada petugas</span>
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
                <SelectContent className="bg-gray-900 border-gray-800 text-gray-100 max-h-[300px]">
                  <SelectItem value="none">
                    <div className="flex items-center gap-2 py-1">
                      <UserX className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">
                        Tidak ada petugas (kosongkan)
                      </span>
                    </div>
                  </SelectItem>
                  {officers.length === 0 ? (
                    <div className="px-2 py-6 text-center text-gray-500 text-sm">
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
                            <div className="font-medium text-gray-100">
                              {officer.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {officer.email}
                            </div>
                            {officer.managedShelters &&
                              officer.managedShelters.length > 0 && (
                                <div className="text-xs text-amber-500 mt-0.5">
                                  Mengelola {officer.managedShelters.length}{" "}
                                  shelter
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
                    Petugas akan dapat mengakses dan mengelola shelter ini
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
              className="hover:bg-gray-800 hover:text-gray-100"
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

      {/* Add/Edit Shelter Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-gray-900 text-gray-100 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingShelter ? "Perbarui Shelter" : "Tambah Shelter Baru"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingShelter
                ? "Bila data tidak relevan, sesuaikan properti shelter di form ini."
                : "Masukkan data logistik untuk penambahan situs bantuan/pengungsian."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-400">
                Nama Shelter Utama
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Cth: Balai Desa Bantul"
                className="bg-gray-950 border-gray-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address" className="text-gray-400">
                Informasi Alamat
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Cth: Jl. Dr. Wahidin Sudiro Kusumo No.3"
                className="bg-gray-950 border-gray-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="capacity" className="text-gray-400">
                  Estimasi Kapasitas
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-gray-950 border-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition" className="text-gray-400">
                  Kelayakhunian
                </Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      condition: value as ShelterCondition,
                    })
                  }
                >
                  <SelectTrigger className="bg-gray-950 border-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 text-gray-100">
                    <SelectItem value="GOOD">Sangat Baik</SelectItem>
                    <SelectItem value="MODERATE">Layak Huni</SelectItem>
                    <SelectItem value="NEEDS_REPAIR">Butuh Rehap</SelectItem>
                    <SelectItem value="DAMAGED">Rusak Berat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-gray-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Tandai Lokasi di Peta
              </Label>
              <p className="text-xs text-gray-600 -mt-1">
                Klik pada peta atau seret penanda untuk memilih koordinat.
              </p>
              <LocationPickerMap
                lat={formData.lat}
                lon={formData.lon}
                onChange={(lat, lon) =>
                  setFormData((prev) => ({ ...prev, lat, lon }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lat" className="text-gray-400 text-xs">
                  Garis Lintang (Lat)
                </Label>
                <Input
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
                  className="bg-gray-950 border-gray-800 font-mono text-xs h-8"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lon" className="text-gray-400 text-xs">
                  Garis Bujur (Lon)
                </Label>
                <Input
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
                  className="bg-gray-950 border-gray-800 font-mono text-xs h-8"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="hover:bg-gray-800 hover:text-gray-100"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
            >
              {editingShelter ? "Simpan Perbaikan" : "Simpan Shelter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
