"use client";

import { useEffect, useState } from "react";
import { officerApi, type Officer } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Shield, Mail } from "lucide-react";

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
  });

  const fetchOfficers = async () => {
    try {
      const data = await officerApi.getAll();
      setOfficers(data);
    } catch (error) {
      toast.error("Gagal memuat data petugas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editingOfficer) {
        const updateData: any = { name: formData.name };
        if (formData.password) updateData.password = formData.password;
        if (formData.phone) updateData.phone = formData.phone;

        await officerApi.update(editingOfficer.id, updateData);
        toast.success("Petugas berhasil diperbarui");
      } else {
        if (!formData.email || !formData.password || !formData.name) {
          toast.error("Email, password, dan nama wajib diisi");
          return;
        }
        await officerApi.create(formData);
        toast.success("Petugas berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchOfficers();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal menyimpan petugas");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus petugas ini?")) return;
    try {
      await officerApi.delete(id);
      toast.success("Petugas berhasil dihapus");
      fetchOfficers();
    } catch (error) {
      toast.error("Gagal menghapus petugas");
    }
  };

  const handleEdit = (officer: Officer) => {
    setEditingOfficer(officer);
    setFormData({
      email: officer.email,
      password: "",
      name: officer.name,
      phone: "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingOfficer(null);
    setFormData({
      email: "",
      password: "",
      name: "",
      phone: "",
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
            <Shield className="h-6 w-6 text-blue-500" />
            Manajemen Petugas Shelter
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Total {officers.length} petugas terdaftar dalam sistem.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Tambah Petugas
        </Button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                <TableHead className="font-semibold text-zinc-400">
                  Nama
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Email
                </TableHead>
                <TableHead className="font-semibold text-zinc-400">
                  Shelter Dikelola
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
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : officers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-zinc-500"
                  >
                    <Shield className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Belum ada petugas terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                officers.map((officer) => (
                  <TableRow
                    key={officer.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors"
                  >
                    <TableCell className="font-medium text-zinc-200">
                      {officer.name}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {officer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 font-medium border-zinc-700 text-zinc-300"
                      >
                        {officer.managedShelters?.length || 0} Shelter
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(officer)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(officer.id)}
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

      {/* Add/Edit Officer Dialog */}
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
                <Shield className="w-6 h-6 text-blue-500" />
                {editingOfficer ? "Edit Petugas" : "Tambah Petugas Baru"}
              </h2>
              <p className="text-zinc-400 text-sm mt-2">
                {editingOfficer
                  ? "Perbarui informasi petugas shelter."
                  : "Buat akun baru untuk petugas shelter yang akan mengelola pengungsian."}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Nama Lengkap */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  Nama Lengkap
                  <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-zinc-500">
                  Nama lengkap petugas yang akan ditampilkan di sistem
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  Alamat Email
                  <span className="text-red-400">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                  disabled={!!editingOfficer}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-zinc-500">
                  {editingOfficer
                    ? "Email tidak dapat diubah setelah akun dibuat"
                    : "Email akan digunakan untuk login ke sistem"}
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  Password
                  {!editingOfficer && <span className="text-red-400">*</span>}
                  {editingOfficer && (
                    <span className="text-xs text-zinc-500 font-normal ml-1">
                      (kosongkan jika tidak diubah)
                    </span>
                  )}
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-zinc-500">
                  Password harus minimal 6 karakter untuk keamanan
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded">
                    <svg
                      className="w-5 h-5 text-blue-400"
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
                    <p className="text-sm text-blue-300 font-medium mb-1">
                      Informasi Penting
                    </p>
                    <p className="text-xs text-blue-400/80 leading-relaxed">
                      Petugas yang ditambahkan akan dapat login ke sistem dan
                      mengelola shelter yang ditugaskan kepada mereka. Pastikan
                      data yang dimasukkan akurat dan email aktif.
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
                disabled={
                  !formData.name ||
                  !formData.email ||
                  (!editingOfficer && !formData.password)
                }
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
              >
                <UserPlus className="w-4 h-4" />
                {editingOfficer ? "Simpan Perubahan" : "Tambah Petugas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
