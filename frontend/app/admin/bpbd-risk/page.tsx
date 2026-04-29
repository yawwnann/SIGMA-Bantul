"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  MapPin,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  importBpbdZones,
  assignRiskToRoads,
  getBpbdStatistics,
  type BpbdStatistics,
} from "@/api/bpbd-risk";

export default function BpbdRiskManagementPage() {
  const [statistics, setStatistics] = useState<BpbdStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const stats = await getBpbdStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      toast.error("Gagal memuat statistik BPBD");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importBpbdZones();
      toast.success(`Berhasil import ${result.imported} zona BPBD`);
      await loadStatistics();
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Gagal import zona BPBD");
    } finally {
      setImporting(false);
    }
  };

  const handleAssign = async () => {
    setAssigning(true);
    try {
      const result = await assignRiskToRoads();
      toast.success(`Berhasil assign risiko ke ${result.assigned} jalan`);
      await loadStatistics();
    } catch (error) {
      console.error("Assignment failed:", error);
      toast.error("Gagal assign risiko ke jalan");
    } finally {
      setAssigning(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH":
        return "bg-red-500";
      case "MEDIUM":
        return "bg-amber-500";
      case "LOW":
        return "bg-green-500";
      default:
        return "bg-zinc-500";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Zona Risiko BPBD</h1>
          <p className="text-muted-foreground mt-1">
            Import dan kelola data zona risiko gempa dari BPBD Bantul
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Zona BPBD
            </CardTitle>
            <CardDescription>
              Import data zona risiko gempa dari file GeoJSON BPBD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import GeoJSON
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              File: Data Wilayah dengan tingkat resiko gempa.geojson
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Assign ke Jalan
            </CardTitle>
            <CardDescription>
              Assign tingkat risiko BPBD ke setiap jalan menggunakan spatial
              join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleAssign}
              disabled={assigning || !statistics?.totalZones}
              className="w-full"
              variant="secondary"
            >
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Assign to Roads
                </>
              )}
            </Button>
            {!statistics?.totalZones && (
              <p className="text-xs text-amber-600 mt-2">
                Import zona BPBD terlebih dahulu
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : statistics ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Zone Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistik Zona BPBD</CardTitle>
              <CardDescription>
                Total zona risiko yang telah diimport
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Zona</span>
                <Badge variant="outline" className="text-lg">
                  {statistics.totalZones}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Distribusi Risiko:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded ${getRiskColor("HIGH")}`}
                      />
                      <span className="text-sm">Risiko Tinggi</span>
                    </div>
                    <Badge variant="destructive">
                      {statistics.byRiskLevel.HIGH}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded ${getRiskColor("MEDIUM")}`}
                      />
                      <span className="text-sm">Risiko Sedang</span>
                    </div>
                    <Badge className="bg-amber-500">
                      {statistics.byRiskLevel.MEDIUM}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded ${getRiskColor("LOW")}`}
                      />
                      <span className="text-sm">Risiko Rendah</span>
                    </div>
                    <Badge className="bg-green-500">
                      {statistics.byRiskLevel.LOW}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Road Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistik Jalan</CardTitle>
              <CardDescription>
                Status assignment risiko BPBD ke jalan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Jalan</span>
                <Badge variant="outline" className="text-lg">
                  {statistics.totalRoads}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Dengan Risiko BPBD</span>
                <Badge variant="outline" className="text-lg">
                  {statistics.roadsWithBpbdRisk}
                </Badge>
              </div>

              {statistics.roadsWithBpbdRisk > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Distribusi Risiko Jalan:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded ${getRiskColor("HIGH")}`}
                        />
                        <span className="text-sm">Risiko Tinggi</span>
                      </div>
                      <Badge variant="destructive">
                        {statistics.roadsByRiskLevel.HIGH}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded ${getRiskColor("MEDIUM")}`}
                        />
                        <span className="text-sm">Risiko Sedang</span>
                      </div>
                      <Badge className="bg-amber-500">
                        {statistics.roadsByRiskLevel.MEDIUM}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded ${getRiskColor("LOW")}`}
                        />
                        <span className="text-sm">Risiko Rendah</span>
                      </div>
                      <Badge className="bg-green-500">
                        {statistics.roadsByRiskLevel.LOW}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Status Alerts */}
      {statistics && (
        <div className="space-y-3">
          {statistics.totalZones === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Belum ada zona BPBD yang diimport. Klik tombol "Import GeoJSON"
                untuk memulai.
              </AlertDescription>
            </Alert>
          )}

          {statistics.totalZones > 0 && statistics.roadsWithBpbdRisk === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Zona BPBD sudah diimport, tetapi belum di-assign ke jalan. Klik
                "Assign to Roads" untuk melanjutkan.
              </AlertDescription>
            </Alert>
          )}

          {statistics.roadsWithBpbdRisk > 0 &&
            statistics.roadsWithBpbdRisk === statistics.totalRoads && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Semua jalan telah berhasil di-assign dengan risiko BPBD.
                  Sistem siap digunakan!
                </AlertDescription>
              </Alert>
            )}
        </div>
      )}
    </div>
  );
}
