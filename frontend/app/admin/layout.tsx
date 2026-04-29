"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authApi } from "@/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  LayoutDashboard,
  Home,
  Building2,
  Map as MapIcon,
  LogOut,
  ShieldAlert,
  UserCircle,
  Settings,
} from "lucide-react";

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/shelters", label: "Shelter Evakuasi", icon: Home },
  { href: "/admin/officers", label: "Petugas Shelter", icon: ShieldAlert },
  { href: "/admin/facilities", label: "Fasilitas Umum", icon: Building2 },
  { href: "/admin/routes", label: "Manajemen Evakuasi", icon: MapIcon },
  { href: "/admin/simulation", label: "Simulasi Gempa", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    // Login page needs no auth check
    if (pathname === "/admin/login") {
      setChecked(true);
      return;
    }

    const token = localStorage.getItem("token");
    console.log(
      "[AdminLayout] token in localStorage:",
      token ? "EXISTS" : "MISSING",
    );

    if (!token) {
      window.location.replace("/admin/login");
      return;
    }

    setAuthed(true);
    setUser(authApi.getCurrentUser());
    setChecked(true);
  }, [pathname]);

  const handleLogout = () => {
    authApi.logout();
    toast.info("Anda telah logout");
    window.location.replace("/admin/login");
  };

  // Always render login page as-is
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Show spinner while checking token
  if (!checked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="dark min-h-screen w-full flex bg-zinc-950 text-zinc-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-zinc-950 border-r border-zinc-800 flex-col fixed inset-y-0 left-0 z-50 shadow-xl">
        <div className="h-16 px-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Image
              src="/logo.png"
              alt="SIGMA Bantul Logo"
              width={20}
              height={20}
              style={{ objectFit: "contain" }}
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-50 tracking-tight leading-none">
              SIGMA Bantul
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-1 leading-none">
              Admin Panel
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4 px-2">
            Menu Utama
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 font-semibold text-white shadow-md shadow-blue-900/20"
                    : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-white" : "text-zinc-500"}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <UserCircle className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 font-medium leading-tight">
                Logged in as
              </p>
              <p className="text-sm font-semibold text-zinc-200 truncate leading-tight">
                {user?.name || "Administrator"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors justify-start px-3"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout Account
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen md:pl-64">
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center sticky top-0 z-40">
          <h2 className="text-base font-semibold text-zinc-100">
            {menuItems.find((item) => item.href === pathname)?.label ||
              "Admin Panel"}
          </h2>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
