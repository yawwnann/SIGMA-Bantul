"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Map,
  Activity,
  Route,
  BookOpen,
  BarChart3,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useSidebar } from "./sidebar-provider";
import { ThemedLogo } from "@/components/ui/themed-logo";
import { EnableNotificationsButton } from "@/components/EnableNotificationsButton";

const navItems = [
  {
    title: "Beranda",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Data Gempa",
    href: "/earthquakes",
    icon: Activity,
  },
  {
    title: "Analisis Frekuensi",
    href: "/analysis",
    icon: BarChart3,
  },
  {
    title: "Manajemen Evakuasi",
    href: "/evacuation",
    icon: Route,
  },
  {
    title: "Edukasi",
    href: "/education",
    icon: BookOpen,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    collapsed: contextCollapsed,
    toggleSidebar,
    mobileOpen,
    toggleMobile,
  } = useSidebar();
  const collapsed = contextCollapsed && !mobileOpen;
  const isAdminPage = pathname.startsWith("/admin");

  if (isAdminPage) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] md:hidden"
          onClick={toggleMobile}
        />
      )}

      <div
        className={cn(
          "fixed left-0 top-0 h-screen flex flex-col bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 transition-all duration-300",
          collapsed ? "md:w-[80px]" : "md:w-64",
          "w-64",
          mobileOpen
            ? "translate-x-0 z-[1000]"
            : "-translate-x-full md:translate-x-0 md:z-[100]",
        )}
      >
        <div
          className={`relative flex items-center border-b border-slate-200 dark:border-zinc-800 py-5 transition-all duration-300 ${collapsed ? "justify-center" : "px-6"}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
              <ThemedLogo
                width={40}
                height={40}
                className="object-contain"
              />
            </div>

            {!collapsed && (
              <div className="overflow-hidden whitespace-nowrap opacity-100 transition-opacity duration-300">
                <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-50 tracking-tight">
                  SIGMA Bantul
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  SIG Manajemen Bencana
                </p>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className="hidden md:flex absolute -right-3 top-7 h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 z-50 transition-colors"
            title={collapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3 inline-block relative left-px" />
            ) : (
              <ChevronLeft className="h-3 w-3 inline-block relative right-px" />
            )}
          </button>
        </div>

        <nav className={`flex-1 space-y-1 py-4 ${collapsed ? "px-2" : "px-3"}`}>
          {!collapsed && (
            <div className="mb-2 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Menu Utama
              </span>
            </div>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 768) toggleMobile();
                }}
                className={cn(
                  "group flex items-center rounded-lg py-2.5 transition-colors overflow-hidden whitespace-nowrap",
                  collapsed ? "justify-center px-0" : "gap-3 px-3 relative",
                  isActive
                    ? "bg-blue-600 dark:bg-zinc-900/50 text-white"
                    : "text-slate-700 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900/50 hover:text-slate-900 dark:hover:text-zinc-50",
                )}
                title={collapsed ? item.title : ""}
              >
                <item.icon
                  className={cn(
                    "shrink-0 h-5 w-5",
                    isActive ? "text-white" : "",
                  )}
                />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.title}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div
          className={`border-t border-slate-200 dark:border-zinc-800 py-4 transition-all ${collapsed ? "px-2" : "px-3"}`}
        >
          {collapsed ? (
            <div
              className="flex justify-center"
              title="Status Darurat: Saat gempa terjadi, segera menuju shelter terdekat."
            >
              <div className="relative p-2 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600">
                <Activity className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700">
                  Status Darurat
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-red-200/70 mt-1">
                Saat gempa terjadi, segera menuju shelter terdekat dan hindari
                zona rawan.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-zinc-800 px-3 py-4 flex flex-col gap-4">
          {/* Notification Toggle */}
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}
          >
            {!collapsed && (
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Notifikasi
              </span>
            )}
            <EnableNotificationsButton collapsed={collapsed} />
          </div>

          {/* Theme Toggle */}
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}
          >
            {!collapsed && (
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Tema Tampilan
              </span>
            )}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="shrink-0 p-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title={collapsed ? "Toggle Tema" : ""}
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-4 w-4 text-zinc-400" />
              ) : mounted && theme !== "dark" ? (
                <Moon className="h-4 w-4 text-slate-600" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
