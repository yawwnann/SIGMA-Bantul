"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import { Menu } from "lucide-react";
import Image from "next/image";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed, toggleMobile } = useSidebar();
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <div className="flex-1 w-full flex flex-col">{children}</div>;
  }

  return (
    <main
      className={`flex-1 min-h-screen flex flex-col overflow-auto transition-all duration-300 ${collapsed ? "md:pl-[80px]" : "md:pl-64"}`}
    >
      {/* Mobile Top Bar */}
      <div className="md:hidden flex flex-none items-center justify-between p-4 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobile}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-gray-800"
          >
            <Menu className="h-6 w-6 text-slate-700 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Logo"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
            <span className="font-bold text-slate-900 dark:text-gray-50">
              SIGMA Bantul
            </span>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </main>
  );
}
