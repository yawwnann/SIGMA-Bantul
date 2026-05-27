"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getLastKnownLocation, type LastKnownLocation } from "@/lib/geolocation-utils";

export interface ManualLocationResult {
  lat: number;
  lng: number;
  source: "manual" | "last-known" | "retry";
}

interface ManualLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected: (location: ManualLocationResult) => void;
  earthquakeLat?: number;
  earthquakeLon?: number;
}

export function ManualLocationModal({
  isOpen,
  onClose,
  onLocationSelected,
  earthquakeLat,
  earthquakeLon,
}: ManualLocationModalProps) {
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [lastKnown, setLastKnown] = useState<LastKnownLocation | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for last known location on open
  useEffect(() => {
    if (isOpen) {
      const lastLoc = getLastKnownLocation();
      setLastKnown(lastLoc);
    }
  }, [isOpen]);

  const handleRetryGPS = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser ini");
      return;
    }

    setIsRetrying(true);
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const result: ManualLocationResult = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "retry",
        };
        toast.success("Lokasi berhasil ditemukan!");
        setIsRetrying(false);
        setLoading(false);
        onLocationSelected(result);
      },
      (error) => {
        console.error("[ManualLocation] Retry GPS error:", error);
        setIsRetrying(false);
        setLoading(false);

        let message = "Gagal mendapatkan lokasi";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Izin lokasi ditolak. Gunakan metode lain.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Lokasi tidak tersedia. Coba masukkan manual.";
            break;
          case error.TIMEOUT:
            message = "Waktu habis. Gunakan metode lain.";
            break;
        }
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleUseLastKnown = () => {
    if (lastKnown) {
      const result: ManualLocationResult = {
        lat: lastKnown.lat,
        lng: lastKnown.lng,
        source: "last-known",
      };
      toast.success(
        `Menggunakan lokasi terakhir (${lastKnown.lat.toFixed(4)}, ${lastKnown.lng.toFixed(4)})`
      );
      onLocationSelected(result);
    }
  };

  const handleUseEpicenter = () => {
    if (earthquakeLat !== undefined && earthquakeLon !== undefined) {
      const result: ManualLocationResult = {
        lat: earthquakeLat,
        lng: earthquakeLon,
        source: "manual",
      };
      toast.info("Menggunakan lokasi episentrum gempa");
      onLocationSelected(result);
    }
  };

  const handleSubmitManual = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Masukkan koordinat yang valid");
      return;
    }

    // Validate latitude range (-90 to 90)
    if (lat < -90 || lat > 90) {
      toast.error("Latitude harus antara -90 dan 90");
      return;
    }

    // Validate longitude range (-180 to 180)
    if (lng < -180 || lng > 180) {
      toast.error("Longitude harus antara -180 dan 180");
      return;
    }

    // Check if within Bantul approximate bounds
    if (lat < -8.15 || lat > -7.8 || lng < 110.15 || lng > 110.5) {
      toast.warning(
        "Koordinat di luar wilayah Kabupaten Bantul. Sistem mungkin tidak dapat memberikan hasil optimal."
      );
    }

    const result: ManualLocationResult = {
      lat,
      lng,
      source: "manual",
    };
    onLocationSelected(result);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 shadow-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full">
              <MapPin className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Lokasi Tidak Dapat Dideteksi
              </DialogTitle>
              <DialogDescription className="text-sm">
                Kami tidak bisa mendapatkan lokasi otomatis Anda
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Retry GPS Button */}
          <Button
            onClick={handleRetryGPS}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Mencoba Lagi...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-2" />
                Coba Deteksi Ulang GPS
              </>
            )}
          </Button>

          {/* Last Known Location */}
          {lastKnown && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Atau gunakan lokasi terakhir yang tersimpan:
              </Label>
              <Button
                onClick={handleUseLastKnown}
                variant="outline"
                className="w-full border-slate-300 dark:border-zinc-700 justify-start text-left h-auto py-3"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-slate-700 dark:text-zinc-200">
                    Lokasi Terakhir Tersimpan
                  </span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                    {lastKnown.lat.toFixed(6)}, {lastKnown.lng.toFixed(6)}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">
                    {Math.round((Date.now() - lastKnown.timestamp) / 60000)} menit yang lalu
                  </span>
                </div>
              </Button>
            </div>
          )}

          {/* Use Epicenter */}
          {earthquakeLat !== undefined && earthquakeLon !== undefined && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                Atau estimasi lokasi Anda di area episentrum:
              </Label>
              <Button
                onClick={handleUseEpicenter}
                variant="outline"
                className="w-full border-slate-300 dark:border-zinc-700 justify-start text-left h-auto py-3"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-slate-700 dark:text-zinc-200">
                    Dekat Episentrum Gempa
                  </span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                    {earthquakeLat.toFixed(6)}, {earthquakeLon.toFixed(6)}
                  </span>
                  <span className="text-xs text-amber-500">
                    ⚠️ Tidak akurat - hanya untuk situasi darurat
                  </span>
                </div>
              </Button>
            </div>
          )}

          {/* Manual Input */}
          <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 space-y-3">
            <Label className="text-sm font-medium text-slate-700 dark:text-zinc-300">
              Atau masukkan koordinat secara manual:
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-zinc-400">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="-7.888888"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-zinc-400">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="110.333333"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleSubmitManual}
              disabled={!latInput || !lngInput}
              variant="secondary"
              className="w-full"
            >
              Gunakan Koordinat Ini
            </Button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800/30">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Lokasi otomatis memberikan hasil terbaik. Input manual mungkin tidak akurat
              dan dapat memengaruhi perhitungan zona keselamatan.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Batal - Tetap di Peta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}