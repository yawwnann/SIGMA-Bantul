"use client";

import { useEffect, useState } from "react";
import { publicFacilityApi } from "@/api";
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
          <p className="text-zinc-400 mt-1 text-sm">
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <Filter className="w-5 h-5 text-emerald-400" />
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v || "all")}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-10 bg-zinc-950 border-zinc-800 text-zinc-200">
              <SelectValue placeholder="Semua Jenis Fasilitas" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
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
          <div className="text-sm text-zinc-500 animate-pulse">
            Memuat data...
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                <TableHead className="font-semibold text-zinc-400">
                  Nama Fasilitas
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Jenis Fasilitas
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Alamat Geografis
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
                    colSpan={4}
                    className="text-center py-12 text-zinc-500"
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
                    className="text-center py-12 text-zinc-500"
                  >
                    <MapIcon className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Tidak ada data fasilitas yang dikelola.
                  </TableCell>
                </TableRow>
              ) : (
                facilities.map((facility) => (
                  <TableRow
                    key={facility.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                  >
                    <TableCell className="font-medium text-zinc-200">
                      {facility.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 font-medium border-zinc-700 text-zinc-300"
                      >
                        {facilityTypeLabels[facility.type] || facility.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">
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

      {/* Add/Edit Facility Dialog */}
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
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-zinc-800 p-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Building className="w-6 h-6 text-emerald-500" />
                {editingFacility ? "Edit Fasilitas" : "Tambah Fasilitas Baru"}
              </h2>
              <p className="text-zinc-400 text-sm mt-2">
                {editingFacility
                  ? "Perbarui metadata fasilitas di bawah ini"
                  : "Tambahkan fasilitas umum baru ke dalam sistem"}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Nama Fasilitas */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <Building className="w-4 h-4 text-emerald-400" />
                  Nama Fasilitas
                  <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: RSUD Panembahan Senopati"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-zinc-500">
                  Nama resmi fasilitas yang mudah dikenali
                </p>
              </div>

              {/* Jenis Fasilitas */}
              <div className="space-y-2">
                <label
                  htmlFor="type"
                  className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <Filter className="w-4 h-4 text-blue-400" />
                  Jenis Fasilitas
                  <span className="text-red-400">*</span>
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="HOSPITAL">Rumah Sakit</option>
                  <option value="SCHOOL">Sekolah</option>
                  <option value="VILLAGE_OFFICE">Kantor Desa</option>
                  <option value="HEALTH_CENTER">Puskesmas</option>
                  <option value="MOSQUE">Masjid</option>
                  <option value="CHURCH">Gereja</option>
                  <option value="MARKET">Pasar</option>
                </select>
                <p className="text-xs text-zinc-500">
                  Kategori fasilitas untuk klasifikasi
                </p>
              </div>

              {/* Alamat */}
              <div className="space-y-2">
                <label
                  htmlFor="address"
                  className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Alamat Lengkap
                </label>
                <input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Contoh: Jl. HOS Cokroaminoto No.5"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-zinc-500">
                  Alamat lengkap untuk memudahkan navigasi
                </p>
              </div>

              {/* Koordinat */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="space-y-2">
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
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-emerald-500/20 rounded">
                    <svg
                      className="w-5 h-5 text-emerald-400"
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
                    <p className="text-sm text-emerald-300 font-medium mb-1">
                      Informasi Penting
                    </p>
                    <p className="text-xs text-emerald-400/80 leading-relaxed">
                      Fasilitas umum akan ditampilkan di peta publik sebagai
                      referensi lokasi penting. Pastikan koordinat dan data yang
                      dimasukkan akurat.
                    </p>
                  </div>
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
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.type}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
              >
                <Building className="w-4 h-4" />
                {editingFacility ? "Simpan Perbaikan" : "Tambah Fasilitas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
