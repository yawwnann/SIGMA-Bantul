"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { evacueeApi, shelterApi, type CreateEvacueeDto } from "@/api";
import {
  EvacueeGender,
  EvacueeStatus,
  type Evacuee,
  type Shelter,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Loader2,
  Home,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function EvacueesPage() {
  const params = useParams();
  const router = useRouter();
  const shelterId = parseInt(params.id as string);

  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [evacuees, setEvacuees] = useState<Evacuee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [editingEvacuee, setEditingEvacuee] = useState<Evacuee | null>(null);
  const [formData, setFormData] = useState<CreateEvacueeDto>({
    shelterId,
    name: "",
    gender: EvacueeGender.MALE,
    age: 0,
    familySize: 1,
  });

  const fetchData = async () => {
    try {
      const [shelterData, evacueeData] = await Promise.all([
        shelterApi.getById(shelterId),
        evacueeApi.getAll(shelterId),
      ]);
      setShelter(shelterData);
      setEvacuees(evacueeData);
    } catch (error: any) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [shelterId]);

  const handleSubmit = async () => {
    try {
      if (editingEvacuee) {
        await evacueeApi.update(editingEvacuee.id, formData);
        toast.success("Data pengungsi berhasil diperbarui");
      } else {
        await evacueeApi.create(formData);
        toast.success("Pengungsi berhasil didaftarkan");
      }
      setIsDialogOpen(false);
      fetchData();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyimpan data");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data pengungsi ini?"))
      return;
    try {
      await evacueeApi.delete(id);
      toast.success("Data pengungsi berhasil dihapus");
      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus data");
    }
  };

  const handleCheckOut = async (id: number) => {
    if (!confirm("Tandai pengungsi ini sudah pulang?")) return;
    try {
      await evacueeApi.update(id, {
        status: EvacueeStatus.RETURNED_HOME,
        checkOutDate: new Date().toISOString(),
      });
      toast.success("Pengungsi berhasil ditandai sudah pulang");
      fetchData();
    } catch (error) {
      toast.error("Gagal mengubah status");
    }
  };

  const resetForm = () => {
    setEditingEvacuee(null);
    setFormData({
      shelterId,
      name: "",
      gender: EvacueeGender.MALE,
      age: 0,
      familySize: 1,
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-zinc-400 text-sm">Memuat data...</p>
      </div>
    );
  }

  if (!shelter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-zinc-500">
        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
        <p>Shelter tidak ditemukan</p>
      </div>
    );
  }

  const currentOccupancy = shelter.currentOccupancy ?? 0;
  const activeEvacuees = evacuees.filter(
    (e) => e.status === EvacueeStatus.ACTIVE,
  );
  const occupancyPercentage = (currentOccupancy / shelter.capacity) * 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="hover:bg-zinc-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Shelter Info */}
      <div className="bg-linear-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Home className="w-6 h-6 text-blue-500" />
              {shelter.name}
            </h1>
            <p className="text-zinc-400 text-sm flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {shelter.address || "Alamat tidak tersedia"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white mb-1">
              {shelter.currentOccupancy} / {shelter.capacity}
            </div>
            <p className="text-xs text-zinc-500">
              {occupancyPercentage.toFixed(0)}% Terisi
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                occupancyPercentage > 90
                  ? "bg-red-500"
                  : occupancyPercentage > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {activeEvacuees.length}
              </div>
              <p className="text-xs text-zinc-500">Pengungsi Aktif</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {
                  evacuees.filter(
                    (e) => e.status === EvacueeStatus.RETURNED_HOME,
                  ).length
                }
              </div>
              <p className="text-xs text-zinc-500">Sudah Pulang</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Home className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {shelter.capacity - currentOccupancy}
              </div>
              <p className="text-xs text-zinc-500">Kapasitas Tersisa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-white">Daftar Pengungsi</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              resetForm();
              setIsQuickMode(true);
              setIsDialogOpen(true);
            }}
            variant="outline"
            className="bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Daftar Cepat
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsQuickMode(false);
              setIsDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Daftar Lengkap
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow className="border-b border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400">Nama</TableHead>
              <TableHead className="text-zinc-400">Gender</TableHead>
              <TableHead className="text-zinc-400">Umur</TableHead>
              <TableHead className="text-zinc-400">Jumlah Keluarga</TableHead>
              <TableHead className="text-zinc-400">Kontak</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evacuees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-zinc-500"
                >
                  <Users className="w-8 h-8 opacity-20 mx-auto mb-3" />
                  Belum ada pengungsi terdaftar
                </TableCell>
              </TableRow>
            ) : (
              evacuees.map((evacuee) => (
                <TableRow
                  key={evacuee.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/20"
                >
                  <TableCell className="font-medium text-zinc-200">
                    {evacuee.name}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {evacuee.gender === EvacueeGender.MALE
                      ? "Laki-laki"
                      : "Perempuan"}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {evacuee.age} tahun
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {evacuee.familySize} orang
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {evacuee.phone || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        evacuee.status === EvacueeStatus.ACTIVE
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : evacuee.status === EvacueeStatus.RETURNED_HOME
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }
                    >
                      {evacuee.status === EvacueeStatus.ACTIVE
                        ? "Aktif"
                        : evacuee.status === EvacueeStatus.RETURNED_HOME
                          ? "Pulang"
                          : "Pindah"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {evacuee.status === EvacueeStatus.ACTIVE && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCheckOut(evacuee.id)}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        Pulang
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(evacuee.id)}
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

      {/* Add Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsDialogOpen(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-zinc-800 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {isQuickMode ? (
                  <>
                    <UserPlus className="w-6 h-6 text-amber-500" />
                    Daftar Cepat (Emergency Mode)
                  </>
                ) : (
                  <>
                    <UserPlus className="w-6 h-6 text-blue-500" />
                    Daftar Lengkap
                  </>
                )}
              </h2>
              <p className="text-zinc-400 text-sm mt-2">
                {isQuickMode
                  ? "Pendaftaran cepat untuk situasi darurat - data bisa dilengkapi nanti"
                  : "Masukkan data lengkap pengungsi untuk administrasi"}
              </p>
              {isQuickMode && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-xs text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Mode darurat: Hanya nama kepala keluarga dan jumlah anggota
                    yang wajib diisi
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Nama - Always Required */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-300">
                  Nama Kepala Keluarga <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Jumlah Keluarga - Always Required */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-300">
                  Jumlah Anggota Keluarga{" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formData.familySize}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      familySize: parseInt(e.target.value) || 1,
                    })
                  }
                  placeholder="1"
                  min="1"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-zinc-500">
                  Total orang yang mengungsi (termasuk kepala keluarga)
                </p>
              </div>

              {/* Detail Fields - Only in Full Mode */}
              {!isQuickMode && (
                <>
                  <div className="border-t border-zinc-800 pt-5 mt-5">
                    <p className="text-sm font-semibold text-zinc-400 mb-4">
                      Data Detail (Opsional)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300">
                        Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            gender: e.target.value as EvacueeGender,
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={EvacueeGender.MALE}>Laki-laki</option>
                        <option value={EvacueeGender.FEMALE}>Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300">
                        Umur
                      </label>
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            age: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300">
                      NIK (Nomor Induk Kependudukan)
                    </label>
                    <input
                      type="text"
                      value={formData.nik || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, nik: e.target.value })
                      }
                      placeholder="3402010101900001"
                      maxLength={16}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="081234567890"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300">
                      Alamat Asal
                    </label>
                    <input
                      type="text"
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Alamat lengkap"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300">
                      Kebutuhan Khusus
                    </label>
                    <input
                      type="text"
                      value={formData.specialNeeds || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialNeeds: e.target.value,
                        })
                      }
                      placeholder="Contoh: Kursi roda, Susu bayi, dll"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300">
                      Kondisi Medis
                    </label>
                    <input
                      type="text"
                      value={formData.medicalCondition || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          medicalCondition: e.target.value,
                        })
                      }
                      placeholder="Contoh: Diabetes, Hipertensi, dll"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-300">
                      Catatan Tambahan
                    </label>
                    <textarea
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Catatan lainnya..."
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </>
              )}

              {/* Info Box */}
              {isQuickMode ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-sm text-amber-300 mb-2 font-medium">
                    💡 Tips Pendaftaran Cepat:
                  </p>
                  <ul className="text-xs text-amber-400 space-y-1 list-disc list-inside">
                    <li>Cukup catat nama kepala keluarga dan jumlah anggota</li>
                    <li>Data detail bisa dilengkapi setelah situasi aman</li>
                    <li>Fokus pada evakuasi dan keselamatan terlebih dahulu</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-300 mb-2 font-medium">
                    📋 Pendaftaran Lengkap
                  </p>
                  <p className="text-xs text-blue-400">
                    Data lengkap membantu dalam distribusi bantuan, koordinasi
                    dengan keluarga, dan identifikasi kebutuhan khusus.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 p-6 flex justify-end gap-3">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  !formData.name ||
                  formData.familySize < 1 ||
                  (!isQuickMode && formData.age <= 0)
                }
                className={`px-5 py-2.5 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 ${
                  isQuickMode
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                {isQuickMode ? "Daftar Cepat" : "Daftar Lengkap"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
