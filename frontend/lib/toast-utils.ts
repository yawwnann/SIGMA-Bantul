/**
 * Toast Utility - Konsisten untuk semua halaman
 * Menggunakan Sonner library dengan styling yang seragam
 */

import { toast as sonnerToast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Home,
  AlertCircle,
} from "lucide-react";
import { createElement } from "react";

// Toast duration constants
const DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 7000,
  PERSISTENT: 10000,
} as const;

// Toast options interface
interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Success Toast - Untuk operasi yang berhasil
 */
export const toastSuccess = (message: string, options?: ToastOptions) => {
  return sonnerToast.success(message, {
    icon: createElement(CheckCircle2, { className: "w-5 h-5" }),
    duration: options?.duration || DURATION.MEDIUM,
    description: options?.description,
    action: options?.action,
  });
};

/**
 * Error Toast - Untuk error atau operasi gagal
 */
export const toastError = (message: string, options?: ToastOptions) => {
  return sonnerToast.error(message, {
    icon: createElement(XCircle, { className: "w-5 h-5" }),
    duration: options?.duration || DURATION.LONG,
    description: options?.description,
    action: options?.action,
  });
};

/**
 * Warning Toast - Untuk peringatan
 */
export const toastWarning = (message: string, options?: ToastOptions) => {
  return sonnerToast.warning(message, {
    icon: createElement(AlertTriangle, { className: "w-5 h-5" }),
    duration: options?.duration || DURATION.MEDIUM,
    description: options?.description,
    action: options?.action,
  });
};

/**
 * Info Toast - Untuk informasi umum
 */
export const toastInfo = (message: string, options?: ToastOptions) => {
  return sonnerToast.info(message, {
    icon: createElement(Info, { className: "w-5 h-5" }),
    duration: options?.duration || DURATION.MEDIUM,
    description: options?.description,
    action: options?.action,
  });
};

/**
 * Loading Toast - Untuk proses yang sedang berjalan
 * Returns toast ID yang bisa digunakan untuk dismiss
 */
export const toastLoading = (message: string, description?: string) => {
  return sonnerToast.loading(message, {
    icon: createElement(Loader2, {
      className: "w-5 h-5 text-blue-500 animate-spin",
    }),
    description,
    duration: Infinity, // Tidak auto-dismiss
  });
};

/**
 * Promise Toast - Untuk operasi async dengan loading state
 */
export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  },
) => {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
};

/**
 * Dismiss specific toast by ID
 */
export const toastDismiss = (toastId: string | number) => {
  sonnerToast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const toastDismissAll = () => {
  sonnerToast.dismiss();
};

// ============================================
// SPECIALIZED TOASTS - Untuk use case spesifik
// ============================================

/**
 * Location Toast - Untuk operasi terkait lokasi
 */
export const toastLocation = {
  getting: () =>
    toastLoading("Mendapatkan lokasi Anda...", "Mohon izinkan akses lokasi"),

  success: (lat: number, lng: number) =>
    toastSuccess("Lokasi berhasil didapatkan", {
      description: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    }),

  denied: () =>
    toastError("Izin lokasi ditolak", {
      description: "Silakan aktifkan izin lokasi di pengaturan browser",
      duration: DURATION.LONG,
    }),

  unavailable: () =>
    toastError("Lokasi tidak tersedia", {
      description: "GPS tidak dapat menentukan lokasi Anda saat ini",
    }),

  timeout: () =>
    toastWarning("Waktu habis", {
      description:
        "Permintaan lokasi memakan waktu terlalu lama. Silakan coba lagi",
    }),

  outsideBantul: () =>
    toastError("Lokasi di luar wilayah Bantul", {
      description: "Fitur ini hanya tersedia untuk wilayah Kabupaten Bantul",
      duration: DURATION.LONG,
    }),
};

/**
 * Route Toast - Untuk operasi terkait routing/navigasi
 */
export const toastRoute = {
  calculating: () =>
    toastLoading("Menghitung rute...", "Mencari jalur terbaik untuk evakuasi"),

  success: (shelterName: string, distance: number) =>
    toastSuccess(`Rute ke ${shelterName} ditemukan!`, {
      description: `Jarak: ${distance.toFixed(2)} km`,
      duration: DURATION.MEDIUM,
    }),

  error: () =>
    toastError("Gagal menghitung rute", {
      description: "Silakan coba lagi atau pilih shelter lain",
      duration: DURATION.LONG,
    }),

  noPath: () =>
    toastWarning("Tidak ada jalur tersedia", {
      description: "Tidak ditemukan rute dari lokasi Anda ke shelter tujuan",
      duration: DURATION.LONG,
    }),
};

/**
 * Emergency Toast - Untuk notifikasi darurat
 */
export const toastEmergency = {
  alert: (title: string, description: string, onViewRoute?: () => void) =>
    toastError(title, {
      description,
      duration: DURATION.PERSISTENT,
      action: onViewRoute
        ? {
            label: "Lihat Rute",
            onClick: onViewRoute,
          }
        : undefined,
    }),

  searching: () =>
    toastInfo("Mencari rute evakuasi darurat...", {
      description: "Mohon izinkan akses lokasi untuk menghitung rute terdekat",
      duration: DURATION.MEDIUM,
    }),

  found: (shelterName: string, distance: number) =>
    toastSuccess(`Rute darurat ke ${shelterName} ditemukan!`, {
      description: `Jarak: ${distance.toFixed(2)} km - Segera evakuasi!`,
      duration: DURATION.LONG,
    }),
};

/**
 * Shelter Toast - Untuk operasi terkait shelter
 */
export const toastShelter = {
  noCapacity: () =>
    toastWarning("Shelter penuh", {
      description:
        "Tidak ada shelter dengan kapasitas tersedia. Mencari shelter terdekat...",
      duration: DURATION.LONG,
    }),

  registered: (shelterName: string) =>
    toastSuccess("Berhasil terdaftar", {
      description: `Anda telah terdaftar di ${shelterName}`,
    }),

  checkIn: (shelterName: string) =>
    toastSuccess("Check-in berhasil", {
      description: `Selamat datang di ${shelterName}`,
    }),

  checkOut: (shelterName: string) =>
    toastSuccess("Check-out berhasil", {
      description: `Terima kasih telah menggunakan ${shelterName}`,
    }),
};

/**
 * Data Toast - Untuk operasi CRUD
 */
export const toastData = {
  loading: () => toastLoading("Memuat data..."),

  loadError: () =>
    toastError("Gagal memuat data", {
      description: "Silakan refresh halaman atau coba lagi nanti",
    }),

  saveSuccess: (itemName?: string) =>
    toastSuccess(
      itemName ? `${itemName} berhasil disimpan` : "Data berhasil disimpan",
    ),

  saveError: () =>
    toastError("Gagal menyimpan data", {
      description: "Silakan periksa koneksi dan coba lagi",
    }),

  deleteSuccess: (itemName?: string) =>
    toastSuccess(
      itemName ? `${itemName} berhasil dihapus` : "Data berhasil dihapus",
    ),

  deleteError: () =>
    toastError("Gagal menghapus data", {
      description: "Silakan coba lagi",
    }),

  updateSuccess: (itemName?: string) =>
    toastSuccess(
      itemName ? `${itemName} berhasil diperbarui` : "Data berhasil diperbarui",
    ),

  updateError: () =>
    toastError("Gagal memperbarui data", {
      description: "Silakan coba lagi",
    }),
};

/**
 * Auth Toast - Untuk operasi autentikasi
 */
export const toastAuth = {
  loginSuccess: (userName?: string) =>
    toastSuccess(userName ? `Selamat datang, ${userName}!` : "Login berhasil"),

  loginError: () =>
    toastError("Login gagal", {
      description: "Email atau password salah",
    }),

  logoutSuccess: () =>
    toastSuccess("Logout berhasil", {
      description: "Sampai jumpa lagi!",
    }),

  sessionExpired: () =>
    toastWarning("Sesi berakhir", {
      description: "Silakan login kembali",
      duration: DURATION.LONG,
    }),

  unauthorized: () =>
    toastError("Akses ditolak", {
      description: "Anda tidak memiliki izin untuk mengakses halaman ini",
      duration: DURATION.LONG,
    }),
};

/**
 * Notification Toast - Untuk push notifications
 */
export const toastNotification = {
  enabled: () =>
    toastSuccess("Notifikasi darurat telah aktif!", {
      description: "Anda akan menerima peringatan gempa",
    }),

  denied: () =>
    toastError("Izin notifikasi ditolak", {
      description: "Silakan aktifkan di pengaturan browser",
      duration: DURATION.LONG,
    }),

  error: () =>
    toastError("Gagal mengaktifkan notifikasi", {
      description: "Silakan coba lagi atau periksa pengaturan browser",
    }),
};

/**
 * Network Toast - Untuk status koneksi
 */
export const toastNetwork = {
  offline: () =>
    toastWarning("Koneksi terputus", {
      description: "Beberapa fitur mungkin tidak tersedia",
      duration: DURATION.PERSISTENT,
    }),

  online: () =>
    toastSuccess("Koneksi kembali", {
      description: "Anda kembali online",
    }),

  slow: () =>
    toastWarning("Koneksi lambat", {
      description: "Memuat data mungkin memakan waktu lebih lama",
    }),
};

// Export default object dengan semua toast functions
export const toast = {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  loading: toastLoading,
  promise: toastPromise,
  dismiss: toastDismiss,
  dismissAll: toastDismissAll,

  // Specialized toasts
  location: toastLocation,
  route: toastRoute,
  emergency: toastEmergency,
  shelter: toastShelter,
  data: toastData,
  auth: toastAuth,
  notification: toastNotification,
  network: toastNetwork,

  // Duration constants
  DURATION,
};

export default toast;
