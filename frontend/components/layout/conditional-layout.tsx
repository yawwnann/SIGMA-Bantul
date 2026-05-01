"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { AppLayout } from "@/components/layout/app-layout";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if current path is admin or officer
  const isAdminOrOfficer =
    pathname.startsWith("/admin") || pathname.startsWith("/officer");

  // If admin or officer, render children without sidebar
  if (isAdminOrOfficer) {
    return <>{children}</>;
  }

  // Otherwise, render with public sidebar
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <AppLayout>{children}</AppLayout>
      </div>
    </SidebarProvider>
  );
}
