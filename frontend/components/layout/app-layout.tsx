"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import { Menu } from "lucide-react";
import { ThemedLogo } from "@/components/ui/themed-logo";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, toggleMobile } = useSidebar();
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/officer")) {
    return <div className="flex-1 w-full flex flex-col">{children}</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex flex-none items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobile}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <Menu className="h-6 w-6 text-slate-700 dark:text-zinc-300" />
          </button>
          <div className="flex items-center gap-2">
            <ThemedLogo
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
            <span className="font-bold text-slate-900 dark:text-zinc-50">
              SIGMA Bantul
            </span>
          </div>
        </div>
      </div>

      {/* Page Content with proper margin for sidebar */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "md:ml-[80px]" : "md:ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
