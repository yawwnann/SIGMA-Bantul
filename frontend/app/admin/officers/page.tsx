"use client";

import { useEffect, useState } from "react";
import { officerApi, type Officer } from "@/api";
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
          <p className="text-gray-400 mt-1 text-sm">
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

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-950/50">
              <TableRow className="border-b border-gray-800 hover:bg-transparent">
                <TableHead className="font-semibold text-gray-400">
                  Nama
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Email
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Shelter Dikelola
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
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : officers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-gray-500"
                  >
                    <Shield className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Belum ada petugas terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                officers.map((officer) => (
                  <TableRow
                    key={officer.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-200">
                      {officer.name}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {officer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-gray-800 font-medium border-gray-700 text-gray-300"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-gray-900 text-gray-100 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingOfficer ? "Edit Petugas" : "Tambah Petugas Baru"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingOfficer
                ? "Perbarui informasi petugas shelter."
                : "Buat akun baru untuk petugas shelter."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-400">
                Nama Lengkap
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Nama petugas"
                className="bg-gray-950 border-gray-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-400">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
                disabled={!!editingOfficer}
                className="bg-gray-950 border-gray-800 focus-visible:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-gray-400">
                Password {editingOfficer && "(kosongkan jika tidak diubah)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Minimal 6 karakter"
                className="bg-gray-950 border-gray-800 focus-visible:ring-blue-500"
              />
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
              {editingOfficer ? "Simpan Perubahan" : "Tambah Petugas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
