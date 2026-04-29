import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SIG Bantul - Sistem Informasi Geografis Manajemen Krisis Gempa Bumi",
  description:
    "Sistem Informasi Geografis untuk manajemen krisis gempa bumi di Kabupaten Bantul",
  keywords: [
    "SIG",
    "GIS",
    "gempa bumi",
    "Bantul",
    "evakuasi",
    "shelter",
    "BPBD",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={
          inter.variable +
          " font-sans min-h-screen antialiased bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50"
        }
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <AppLayout>
                <PushNotificationManager />
                {children}
              </AppLayout>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
