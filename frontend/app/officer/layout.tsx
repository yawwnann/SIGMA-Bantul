"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authApi } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, UserCircle } from "lucide-react";

type CurrentUser = {
  name: string;
  role: string;
};

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const currentUser = authApi.getCurrentUser();

    if (!token || !currentUser) {
      window.location.replace("/admin/login");
      return;
    }

    if (currentUser.role !== "SHELTER_OFFICER") {
      toast.error("Akses ditolak. Anda bukan petugas shelter.");
      window.location.replace("/admin/login");
      return;
    }

    setAuthed(true);
    setUser(currentUser);
    setChecked(true);
  }, [pathname]);

  const pageTitle = useMemo(() => {
    if (pathname.startsWith("/officer/dashboard")) return "Dashboard";
    if (pathname.includes("/evacuees")) return "Data Pengungsi";
    return "Petugas Shelter";
  }, [pathname]);

  const handleLogout = () => {
    authApi.logout();
    toast.info("Anda telah logout");
    window.location.replace("/admin/login");
  };

  if (!checked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="dark min-h-screen w-full flex flex-col bg-zinc-950 text-zinc-50">
      <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/officer/dashboard" className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Image
                src="/logo.png"
                alt="SIGMA Bantul Logo"
                width={20}
                height={20}
                style={{ width: "auto", height: "auto", objectFit: "contain" }}
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-zinc-50 tracking-tight leading-none">
                SIGMA Bantul
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-1 leading-none">
                Petugas Shelter
              </div>
            </div>
          </Link>

          <div className="hidden md:block h-8 w-px bg-zinc-800" />

          <h2 className="text-sm md:text-base font-semibold text-zinc-100 truncate">
            {pageTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 max-w-[320px]">
            <UserCircle className="w-4 h-4 text-zinc-500" />
            <span className="truncate">{user?.name}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogoutDialogOpen(true)}
            className="bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">{children}</main>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-50">
          <DialogHeader>
            <DialogTitle>Konfirmasi Logout</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Kamu yakin ingin keluar dari akun petugas shelter?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="border-zinc-800 bg-zinc-900/50">
            <DialogClose
              render={
                <Button
                  variant="outline"
                  className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800"
                />
              }
            >
              Batal
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setLogoutDialogOpen(false);
                handleLogout();
              }}
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
