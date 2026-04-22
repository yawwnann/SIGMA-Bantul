"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { earthquakeApi } from "@/api/earthquake";
import { Loader2, Activity, MapPin } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic map for selecting coordinate
const DynamicMap = dynamic(
  () => import("@/components/map/map-client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-slate-100 dark:bg-gray-900 rounded-lg animate-pulse" />
    ),
  },
);

export default function SimulationPage() {
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    magnitude: "6.5",
    depth: "10",
    location: "Simulasi Pusat Gempa Bantul",
    region: "DIY Yogyakarta",
    lat: "-7.888", // Pusat Bantul approx
    lon: "110.330",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        magnitude: parseFloat(formData.magnitude),
        depth: parseFloat(formData.depth),
        lat: parseFloat(formData.lat),
        lon: parseFloat(formData.lon),
        location: formData.location,
        region: formData.region,
        time: new Date().toISOString(),
        isLatest: true,
        dirasakan: "IV MMI (Simulasi)",
      };

      await earthquakeApi.create(payload);

      toast.success("Simulasi Berhasil Dibuat", {
        description:
          "Gempa tersimpan dan Web Push Notification semestinya telah dibroadcast ke seluruh klien.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Gagal memicu simulasi", {
        description: "Periksa kembali koordinat dan koneksi backend",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setFormData((prev) => ({
      ...prev,
      lat: lat.toFixed(5),
      lon: lng.toFixed(5),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Zona Simulasi (Seminar)
        </h1>
        <p className="text-muted-foreground mt-2">
          Fitur ini dikhususkan untuk keperluan presentasi dan pengujian sistem
          notifikasi evakuasi. Mengirim form ini akan mencatat gempa live di
          database yang memicu Web Socket & Push Notification berikut
          mengacaukan Radius Evakuasi di peta warga.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Parameter Gempa Buatan
              </CardTitle>
              <CardDescription>
                Atur besaran Mg, Titik Koordinat, dan Kedalaman
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kekuatan (Magnitude)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    name="magnitude"
                    required
                    min="0"
                    value={formData.magnitude}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kedalaman (km)</Label>
                  <Input
                    type="number"
                    step="1"
                    name="depth"
                    required
                    min="0"
                    value={formData.depth}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    name="lat"
                    required
                    value={formData.lat}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    name="lon"
                    required
                    value={formData.lon}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Kiat: Arahkan klik di peta bagian kanan untuk menentukan
                Latitude/Longitude secara instan.
              </p>

              <div className="space-y-2">
                <Label>Nama Lokasi/Keterangan Darurat</Label>
                <Input
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Misal: 10 KM Barat Daya BANTUL-DIY"
                />
              </div>

              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  name="region"
                  required
                  value={formData.region}
                  onChange={handleChange}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Picu Peringatan Tsunami / Evakuasi Sekarang"
                )}
              </Button>
            </CardContent>
          </Card>
        </form>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              Visualisasi Titik Episentrum
            </CardTitle>
            <CardDescription>
              Klik peta untuk menentukan titik gempa uji
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[450px] w-full rounded-md border border-slate-200 dark:border-gray-800 overflow-hidden">
              <DynamicMap
                shelters={[]}
                earthquakes={[]}
                hazardZones={[]}
                facilities={[]}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
