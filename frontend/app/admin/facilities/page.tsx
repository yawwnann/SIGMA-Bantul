"use client";

import { useEffect, useState } from "react";
import { publicFacilityApi } from "@/api";
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
import { Building, Plus, Filter, MapPin, MapIcon } from "lucide-react";
import type { PublicFacility } from "@/types";

const facilityTypeLabels: Record<string, string> = {
  HOSPITAL: "Rumah Sakit",
  SCHOOL: "Sekolah",
  VILLAGE_OFFICE: "Kantor Desa",
  HEALTH_CENTER: "Puskesmas",
  MOSQUE: "Masjid",
  CHURCH: "Gereja",
  MARKET: "Pasar",
};

export default function AdminFacilitiesPage() {
  const [facilities, setFacilities] = useState<PublicFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<PublicFacility | null>(
    null,
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    type: "HOSPITAL",
    address: "",
    lat: -7.888,
    lon: 110.33,
  });

  const fetchFacilities = async () => {
    try {
      const data =
        filterType !== "all"
          ? await publicFacilityApi.getAll(filterType)
          : await publicFacilityApi.getAll();
      setFacilities(data);
    } catch (error) {
      toast.error("Gagal memuat data fasilitas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [filterType]);

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        address: formData.address,
        geometry: {
          type: "Point",
          coordinates: [formData.lon, formData.lat],
        },
      };

      if (editingFacility) {
        await publicFacilityApi.update(editingFacility.id, payload);
        toast.success("Fasilitas berhasil diperbarui");
      } else {
        await publicFacilityApi.create(payload);
        toast.success("Fasilitas berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchFacilities();
      resetForm();
    } catch (error) {
      toast.error("Gagal menyimpan fasilitas");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus fasilitas ini?")) return;
    try {
      await publicFacilityApi.delete(id);
      toast.success("Fasilitas berhasil dihapus");
      fetchFacilities();
    } catch (error) {
      toast.error("Gagal menghapus fasilitas");
    }
  };

  const handleEdit = (facility: PublicFacility) => {
    setEditingFacility(facility);
    const coords = (facility.geometry as { coordinates?: [number, number] })
      ?.coordinates;
    setFormData({
      name: facility.name,
      type: facility.type,
      address: facility.address || "",
      lat: coords?.[1] || -7.888,
      lon: coords?.[0] || 110.33,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFacility(null);
    setFormData({
      name: "",
      type: "HOSPITAL",
      address: "",
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building className="h-6 w-6 text-emerald-500" />
            Manajemen Fasilitas Umum
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            Total {facilities.length} fasilitas terdaftar dalam pangkalan data.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Tambah Fasilitas
        </Button>
      </div>

      {/* Toolbar / Layout Spacing */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Filter className="w-5 h-5 text-emerald-400" />
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v || "all")}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-10 bg-gray-950 border-gray-800 text-gray-200">
              <SelectValue placeholder="Semua Jenis Fasilitas" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-gray-200">
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="HOSPITAL">Rumah Sakit</SelectItem>
              <SelectItem value="SCHOOL">Sekolah</SelectItem>
              <SelectItem value="VILLAGE_OFFICE">Kantor Desa</SelectItem>
              <SelectItem value="HEALTH_CENTER">Puskesmas</SelectItem>
              <SelectItem value="MOSQUE">Masjid</SelectItem>
              <SelectItem value="CHURCH">Gereja</SelectItem>
              <SelectItem value="MARKET">Pasar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="text-sm text-gray-500 animate-pulse">
            Memuat data...
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-950/50">
              <TableRow className="border-b border-gray-800 hover:bg-transparent">
                <TableHead className="font-semibold text-gray-400">
                  Nama Fasilitas
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Jenis Fasilitas
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Alamat Geografis
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
                    colSpan={4}
                    className="text-center py-12 text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      Sinkronisasi pangkalan data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : facilities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-gray-500"
                  >
                    <MapIcon className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Tidak ada data fasilitas yang dikelola.
                  </TableCell>
                </TableRow>
              ) : (
                facilities.map((facility) => (
                  <TableRow
                    key={facility.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-200">
                      {facility.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-gray-800 font-medium border-gray-700 text-gray-300"
                      >
                        {facilityTypeLabels[facility.type] || facility.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />{" "}
                        {facility.address || "Area Tidak Diketahui"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(facility)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(facility.id)}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 text-gray-100 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingFacility ? "Edit Fasilitas" : "Tambah Fasilitas"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingFacility
                ? "Perbarui metadata fasilitas di bawah ini"
                : "Tambah fasilitas umum baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-400">
                Nama Fasilitas
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Cth: RSUD Panembahan Senopati"
                className="bg-gray-950 border-gray-800 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-gray-400">
                Jenis Fasilitas
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value || "HOSPITAL" })
                }
              >
                <SelectTrigger className="bg-gray-950 border-gray-800 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-gray-100">
                  <SelectItem value="HOSPITAL">Rumah Sakit</SelectItem>
                  <SelectItem value="SCHOOL">Sekolah</SelectItem>
                  <SelectItem value="VILLAGE_OFFICE">Kantor Desa</SelectItem>
                  <SelectItem value="HEALTH_CENTER">Puskesmas</SelectItem>
                  <SelectItem value="MOSQUE">Masjid</SelectItem>
                  <SelectItem value="CHURCH">Gereja</SelectItem>
                  <SelectItem value="MARKET">Pasar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address" className="text-gray-400">
                Alamat Lengkap
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Alamat fasilitas"
                className="bg-gray-950 border-gray-800 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lat" className="text-gray-400">
                  Latitude
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
                  className="bg-gray-950 border-gray-800 font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lon" className="text-gray-400">
                  Longitude
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
                  className="bg-gray-950 border-gray-800 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="hover:bg-gray-800 hover:text-gray-100"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
            >
              {editingFacility ? "Simpan Perbaikan" : "Validasi Titik"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
