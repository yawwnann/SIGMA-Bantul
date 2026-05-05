import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ConditionalLayout } from "@/components/layout/conditional-layout";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { PwaPermissionModal } from "@/components/pwa-permission-modal";
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
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/logo-black/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo-white/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [
      {
        url: "/logo-black/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport = {
  themeColor: "#09090b",
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
          " font-sans min-h-screen antialiased bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 overflow-x-hidden"
        }
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <PushNotificationManager />
          <PwaPermissionModal />
          <ConditionalLayout>{children}</ConditionalLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
