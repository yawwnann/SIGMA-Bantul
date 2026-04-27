/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { roadApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MapIcon,
  Filter,
  Route,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Pencil,
  Undo2,
  Trash2,
  MousePointerClick,
  CheckCircle2,
  X,
} from "lucide-react";
import { Road, RoadType, RoadCondition, RoadVulnerability } from "@/types";

// ── Label maps ───────────────────────────────────────────────────────────────
const roadTypeLabels: Record<string, string> = {
  NATIONAL: "Nasional",
  PROVINCIAL: "Provinsi",
  REGIONAL: "Wilayah",
  LOCAL: "Lokal",
};
const roadConditionLabels: Record<string, string> = {
  GOOD: "Baik",
  MODERATE: "Sedang",
  POOR: "Buruk",
  DAMAGED: "Rusak",
};
const vulnerabilityLabels: Record<string, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
};
const conditionColors: Record<string, string> = {
  GOOD: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MODERATE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  POOR: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  DAMAGED: "bg-red-500/10 text-red-500 border-red-500/20",
};
const vulnerabilityColors: Record<string, string> = {
  LOW: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
};
const conditionStrokeColor: Record<string, string> = {
  GOOD: "#10b981",
  MODERATE: "#f59e0b",
  POOR: "#f97316",
  DAMAGED: "#ef4444",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function safeRemoveLeafletMap(
  mapRef: React.RefObject<HTMLDivElement | null>,
  mapInstanceRef: React.MutableRefObject<any>,
) {
  if (mapInstanceRef.current) {
    try {
      mapInstanceRef.current.remove();
    } catch (_) {}
    mapInstanceRef.current = null;
  }
  if (mapRef.current && (mapRef.current as any)._leaflet_id) {
    delete (mapRef.current as any)._leaflet_id;
  }
}

// ── RoadMapViewer (read-only) ────────────────────────────────────────────────
function RoadMapViewer({ road }: { road: Road }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !road.geometry) return;
    safeRemoveLeafletMap(mapRef, mapInstanceRef);
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;
      if ((mapRef.current as any)._leaflet_id)
        delete (mapRef.current as any)._leaflet_id;

      const geo = road.geometry as any;
      const coords: [number, number][] = geo.coordinates.map(
        (c: number[]) => [c[1], c[0]] as [number, number],
      );
      if (!coords.length) return;

      const map = L.map(mapRef.current!, {
        center: coords[Math.floor(coords.length / 2)],
        zoom: 16,
      });
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const color = conditionStrokeColor[road.condition] || "#3b82f6";
      L.polyline(coords, {
        color,
        weight: 14,
        opacity: 0.15,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      const poly = L.polyline(coords, {
        color,
        weight: 6,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      poly
        .bindPopup(
          `<strong style="font-size:13px">${road.name}</strong><br/>
         <span style="color:#888;font-size:11px">${roadTypeLabels[road.type]} · ${roadConditionLabels[road.condition]}</span>
         ${road.length ? `<br/><span style="color:#888;font-size:11px">Panjang: ${Math.round(road.length).toLocaleString()} m</span>` : ""}`,
        )
        .openPopup();
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    });

    return () => {
      cancelled = true;
      safeRemoveLeafletMap(mapRef, mapInstanceRef);
    };
  }, [road]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} className="w-full h-full" />
    </>
  );
}

// ── RoadDrawingEditor ────────────────────────────────────────────────────────
interface DrawingEditorProps {
  editorKey: string;
  initialCoords: [number, number][];
  condition: string;
  onCoordsChange: (coords: [number, number][]) => void;
}

function RoadDrawingEditor({
  editorKey,
  initialCoords,
  condition,
  onCoordsChange,
}: DrawingEditorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const previewLineRef = useRef<any>(null);
  const coordsRef = useRef<[number, number][]>(initialCoords);
  const LRef = useRef<any>(null);
  const conditionRef = useRef(condition);

  useEffect(() => {
    conditionRef.current = condition;
  }, [condition]);

  const redraw = useCallback(() => {
    const L = LRef.current;
    const group = layerGroupRef.current;
    if (!L || !group) return;
    group.clearLayers();

    const pts = coordsRef.current;
    if (pts.length === 0) return;

    // [lng,lat] → [lat,lng]
    const ll: [number, number][] = pts.map(([lng, lat]) => [lat, lng]);
    const color = conditionStrokeColor[conditionRef.current] || "#3b82f6";

    if (ll.length >= 2) {
      L.polyline(ll, {
        color,
        weight: 12,
        opacity: 0.18,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);
      L.polyline(ll, {
        color,
        weight: 5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(group);
    }

    ll.forEach(([lat, lng], i) => {
      const first = i === 0,
        last = i === ll.length - 1;
      L.circleMarker([lat, lng], {
        radius: first || last ? 9 : 5,
        color: "#18181b",
        fillColor: first ? "#10b981" : last ? "#3b82f6" : "#94a3b8",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(`Titik ${i + 1}`, { permanent: false, direction: "top" })
        .addTo(group);
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    safeRemoveLeafletMap(mapRef, mapInstanceRef);
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;
      if ((mapRef.current as any)._leaflet_id)
        delete (mapRef.current as any)._leaflet_id;

      LRef.current = L;
      const map = L.map(mapRef.current!, {
        center: [-7.888, 110.329],
        zoom: 13,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      layerGroupRef.current = group;
      previewLineRef.current = L.polyline([], {
        color: "#60a5fa",
        weight: 2.5,
        opacity: 0.8,
        dashArray: "8 5",
      }).addTo(map);

      (map.getContainer() as HTMLElement).style.cursor = "crosshair";

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        coordsRef.current = [...coordsRef.current, [lng, lat]];
        onCoordsChange([...coordsRef.current]);
        redraw();
      });

      map.on("mousemove", (e: any) => {
        if (!previewLineRef.current || coordsRef.current.length === 0) return;
        const last = coordsRef.current[coordsRef.current.length - 1];
        previewLineRef.current.setLatLngs([
          [last[1], last[0]],
          [e.latlng.lat, e.latlng.lng],
        ]);
      });

      // If editing — load existing coords and fly to them
      if (coordsRef.current.length > 0) {
        redraw();
        const ll: [number, number][] = coordsRef.current.map(([lng, lat]) => [
          lat,
          lng,
        ]);
        if (ll.length >= 2) {
          const tmp = L.polyline(ll).addTo(map);
          map.fitBounds(tmp.getBounds(), { padding: [40, 40] });
          tmp.remove();
        } else {
          map.setView(ll[0], 16);
        }
      }
    });

    return () => {
      cancelled = true;
      safeRemoveLeafletMap(mapRef, mapInstanceRef);
      layerGroupRef.current = null;
      previewLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey]);

  useEffect(() => {
    redraw();
  }, [condition, redraw]);

  const undo = () => {
    if (coordsRef.current.length === 0) return;
    coordsRef.current = coordsRef.current.slice(0, -1);
    onCoordsChange([...coordsRef.current]);
    redraw();
    previewLineRef.current?.setLatLngs([]);
  };

  const clear = () => {
    coordsRef.current = [];
    onCoordsChange([]);
    redraw();
    previewLineRef.current?.setLatLngs([]);
  };

  const ptCount = coordsRef.current.length;

  return (
    <div className="flex flex-col h-full">
      {/* Drawing toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-950 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 text-blue-400 text-sm">
          <MousePointerClick className="w-4 h-4 shrink-0" />
          <span className="font-medium">Klik peta untuk menambah titik</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-2">{ptCount} titik</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={ptCount === 0}
            className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={ptCount === 0}
            className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <div ref={mapRef} className="w-full h-full" />

        {/* Empty state overlay */}
        {ptCount === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="bg-gray-900/85 backdrop-blur-sm border border-gray-700/60 rounded-2xl px-6 py-5 text-center shadow-xl">
              <MousePointerClick className="w-9 h-9 text-blue-400 mx-auto mb-3" />
              <p className="text-gray-200 text-sm font-semibold">
                Mulai menggambar jalur
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Klik minimal 2 titik pada peta
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DrawModal — full-screen portal overlay ───────────────────────────────────
type FormData = {
  name: string;
  type: RoadType;
  condition: RoadCondition;
  vulnerability: RoadVulnerability;
  length: number;
};
const defaultForm: FormData = {
  name: "",
  type: RoadType.LOCAL,
  condition: RoadCondition.GOOD,
  vulnerability: RoadVulnerability.LOW,
  length: 0,
};

interface DrawModalProps {
  open: boolean;
  onClose: () => void;
  editingRoute: Road | null;
  onSaved: () => void;
}

function DrawModal({ open, onClose, editingRoute, onSaved }: DrawModalProps) {
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [drawCoords, setDrawCoords] = useState<[number, number][]>([]);
  const [saving, setSaving] = useState(false);
  const [editorKey, setEditorKey] = useState("new");

  useEffect(() => {
    if (!open) return;
    if (editingRoute) {
      setFormData({
        name: editingRoute.name,
        type: editingRoute.type,
        condition: editingRoute.condition,
        vulnerability: editingRoute.vulnerability,
        length: editingRoute.length || 0,
      });
      const geo = editingRoute.geometry as any;
      const coords: [number, number][] =
        geo?.coordinates?.map(
          (c: number[]) => [c[0], c[1]] as [number, number],
        ) ?? [];
      setDrawCoords(coords);
      setEditorKey(`edit-${editingRoute.id}-${Date.now()}`);
    } else {
      setFormData(defaultForm);
      setDrawCoords([]);
      setEditorKey(`new-${Date.now()}`);
    }
  }, [open, editingRoute]);

  const handleSave = async () => {
    if (drawCoords.length < 2) {
      toast.error("Gambarlah minimal 2 titik");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Nama jalan harus diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        geometry: { type: "LineString", coordinates: drawCoords },
      };
      if (editingRoute) {
        await roadApi.update(editingRoute.id, payload);
        toast.success("Jalur berhasil diperbarui");
      } else {
        await roadApi.create(payload);
        toast.success("Jalur berhasil disimpan");
      }
      onSaved();
      onClose();
    } catch {
      toast.error("Gagal menyimpan jalur");
    } finally {
      setSaving(false);
    }
  };

  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-stretch justify-center"
      style={{ fontFamily: "inherit" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex flex-col bg-gray-900 m-4 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 w-full max-w-6xl">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 bg-gray-950/60 shrink-0">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-100">
              {editingRoute
                ? "Edit Manajemen Evakuasi"
                : "Tambah Manajemen Evakuasi Baru"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {editingRoute
                ? "Gambar ulang atau ubah metadata jalur yang dipilih."
                : "Klik titik-titik di peta untuk menggambar jalur, lalu isi informasi di panel kanan."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="flex flex-1 min-h-0 overflow-hidden"
          style={{ height: "calc(100vh - 12rem)" }}
        >
          {/* Left: Map */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-gray-800">
            <RoadDrawingEditor
              editorKey={editorKey}
              initialCoords={drawCoords}
              condition={formData.condition}
              onCoordsChange={setDrawCoords}
            />
          </div>

          {/* Right: Form panel */}
          <div className="w-80 shrink-0 flex flex-col bg-gray-900">
            {/* Status pill */}
            <div className="px-5 pt-5">
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm ${
                  drawCoords.length >= 2
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-gray-800/50 border-gray-700/50 text-gray-500"
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${drawCoords.length >= 2 ? "text-emerald-400" : "text-gray-600"}`}
                />
                <span className="text-xs font-medium">
                  {drawCoords.length === 0
                    ? "Belum ada titik digambar"
                    : drawCoords.length === 1
                      ? "Tambah 1 titik lagi"
                      : `${drawCoords.length} titik — jalur siap`}
                </span>
              </div>
            </div>

            {/* Form fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Nama */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Nama Jalan{" "}
                  <span className="text-red-400 normal-case tracking-normal">
                    *
                  </span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Cth: Jl. Parangtritis Km 5"
                  className="bg-gray-950 border-gray-700 focus-visible:ring-blue-500 text-sm text-gray-100 placeholder:text-gray-600"
                />
              </div>

              {/* Tipe */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Tipe Jalan
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v as RoadType })
                  }
                >
                  <SelectTrigger className="bg-gray-950 border-gray-700 text-sm text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-gray-100">
                    <SelectItem value="NATIONAL">
                      🛣️ Tingkat Nasional
                    </SelectItem>
                    <SelectItem value="PROVINCIAL">
                      🚦 Tingkat Provinsi
                    </SelectItem>
                    <SelectItem value="REGIONAL">🗺️ Tingkat Wilayah</SelectItem>
                    <SelectItem value="LOCAL">🚪 Jalan Lokal / Gang</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Kondisi */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Kondisi Fisik
                </Label>
                <Select
                  value={formData.condition}
                  onValueChange={(v) =>
                    setFormData({ ...formData, condition: v as RoadCondition })
                  }
                >
                  <SelectTrigger className="bg-gray-950 border-gray-700 text-sm text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-gray-100">
                    <SelectItem value="GOOD">✅ Sangat Baik</SelectItem>
                    <SelectItem value="MODERATE">🟡 Sedang</SelectItem>
                    <SelectItem value="POOR">🟠 Kondisi Buruk</SelectItem>
                    <SelectItem value="DAMAGED">🔴 Rusak Berat</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-600">
                  Warna garis mengikuti kondisi yang dipilih
                </p>
              </div>

              {/* Kerentanan - READ ONLY (dihitung otomatis dari zona BPBD) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Kerentanan Bencana
                </Label>
                <div className="bg-gray-950/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100">
                  <Badge
                    className={vulnerabilityColors[formData.vulnerability]}
                  >
                    {vulnerabilityLabels[formData.vulnerability]}
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-500">
                  ⚠️ Kerentanan dihitung otomatis berdasarkan zona rawan gempa
                  BPBD
                </p>
              </div>

              {/* Panjang */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Panjang Estimasi (m)
                </Label>
                <Input
                  type="number"
                  value={formData.length || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      length: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="bg-gray-950 border-gray-700 text-sm text-gray-100 placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="shrink-0 px-5 py-4 border-t border-gray-800 bg-gray-950/50 space-y-2">
              <Button
                onClick={handleSave}
                disabled={
                  drawCoords.length < 2 || !formData.name.trim() || saving
                }
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-lg shadow-blue-900/20 h-10"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                    Menyimpan...
                  </>
                ) : editingRoute ? (
                  "💾 Simpan Perubahan"
                ) : (
                  "✅ Simpan Jalur"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full text-gray-400 hover:text-gray-100 hover:bg-gray-800 h-9 text-sm"
              >
                Batal
              </Button>
              {drawCoords.length < 2 && (
                <p className="text-center text-[11px] text-gray-600">
                  ⚠️ Minimal 2 titik pada peta diperlukan
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<Road[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterType, setFilterType] = useState<string>("all");

  // Map view modal
  const [mapRoad, setMapRoad] = useState<Road | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Draw modal
  const [isDrawOpen, setIsDrawOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Road | null>(null);

  const fetchRoutes = async (page = 1) => {
    setLoading(true);
    try {
      const resp = await roadApi.getAll({
        page,
        limit: 20,
        type: filterType !== "all" ? filterType : undefined,
      });
      setRoutes(resp.data);
      setTotalPages(resp.meta.totalPages || 1);
      setTotalItems(resp.meta.total || 0);
      setCurrentPage(resp.meta.page || 1);
    } catch {
      toast.error("Gagal memuat data jalur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes(1);
  }, [filterType]);

  const openAdd = () => {
    setEditingRoute(null);
    setIsDrawOpen(true);
  };
  const openEdit = (r: Road) => {
    setEditingRoute(r);
    setIsDrawOpen(true);
  };
  const handleSaved = () => fetchRoutes(currentPage);

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus jalur ini? Tindakan tidak dapat dibatalkan.")) return;
    try {
      await roadApi.delete(id);
      toast.success("Jalur berhasil dihapus");
      fetchRoutes(currentPage);
    } catch {
      toast.error("Gagal menghapus jalur");
    }
  };

  const getGoogleMapsLink = (road: Road) => {
    const geo = road.geometry as any;
    if (!geo?.coordinates?.length) return null;
    const mid = geo.coordinates[Math.floor(geo.coordinates.length / 2)];
    return `https://www.google.com/maps?q=${mid[1]},${mid[0]}`;
  };

  return (
    <div className="py-6 w-full px-4 sm:px-6 md:px-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-100 flex items-center gap-2">
            <Route className="h-6 w-6 text-blue-500" /> Manajemen Evakuasi
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            Total {totalItems} ruas jalan terdaftar dalam sistem.
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 gap-2"
        >
          <Pencil className="w-4 h-4" /> Tambah Manajemen Evakuasi
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Filter className="w-5 h-5 text-blue-400" />
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v || "all")}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-10 bg-gray-950 border-gray-800 text-gray-200">
              <SelectValue placeholder="Semua Jenis Jalan" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800 text-gray-200">
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="NATIONAL">Nasional</SelectItem>
              <SelectItem value="PROVINCIAL">Provinsi</SelectItem>
              <SelectItem value="REGIONAL">Wilayah</SelectItem>
              <SelectItem value="LOCAL">Lokal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading && (
          <div className="text-sm text-gray-500 animate-pulse">
            Memuat data...
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-950/50">
              <TableRow className="border-b border-gray-800 hover:bg-transparent">
                <TableHead className="font-semibold text-gray-400">
                  Nama Jalan
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Jenis
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Kondisi
                </TableHead>
                <TableHead className="font-semibold text-gray-400">
                  Kerentanan
                </TableHead>
                <TableHead className="font-semibold text-gray-400 text-right">
                  L (m)
                </TableHead>
                <TableHead className="font-semibold text-gray-400 text-right">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && routes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                      Sedang memuat data spasial...
                    </div>
                  </TableCell>
                </TableRow>
              ) : routes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-gray-500"
                  >
                    <MapIcon className="w-8 h-8 opacity-20 mx-auto mb-3" />
                    Tidak ada jalur evakuasi.
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((route) => (
                  <TableRow
                    key={route.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-200">
                      {route.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-gray-800 font-normal border-gray-700 text-gray-300"
                      >
                        {roadTypeLabels[route.type] || route.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={conditionColors[route.condition]}>
                        {roadConditionLabels[route.condition] ||
                          route.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={vulnerabilityColors[route.vulnerability]}
                      >
                        {vulnerabilityLabels[route.vulnerability] ||
                          route.vulnerability}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-gray-400 font-mono text-sm">
                      {route.length
                        ? Math.round(route.length).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMapRoad(route);
                            setIsMapOpen(true);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Peta
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(route)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(route.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-gray-800 bg-gray-950/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Menampilkan{" "}
              <span className="font-medium text-gray-300">{routes.length}</span>{" "}
              baris · halaman {currentPage}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRoutes(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <span className="text-sm font-medium text-gray-400">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRoutes(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Map View Dialog */}
      <Dialog
        open={isMapOpen}
        onOpenChange={(open) => {
          setIsMapOpen(open);
          if (!open) setMapRoad(null);
        }}
      >
        <DialogContent className="!max-w-3xl w-full bg-gray-900 text-gray-100 border-gray-800 p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-gray-800">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold text-gray-100 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />{" "}
                  Lokasi Jalan di Peta
                </DialogTitle>
                {mapRoad && (
                  <DialogDescription className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-300 truncate">
                      {mapRoad.name}
                    </span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-500">
                      {roadTypeLabels[mapRoad.type]}
                    </span>
                    <Badge
                      className={`text-xs ${conditionColors[mapRoad.condition]}`}
                    >
                      {roadConditionLabels[mapRoad.condition]}
                    </Badge>
                  </DialogDescription>
                )}
              </div>
              {mapRoad && getGoogleMapsLink(mapRoad) && (
                <a
                  href={getGoogleMapsLink(mapRoad)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/60 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-all shrink-0"
                >
                  <MapIcon className="w-3.5 h-3.5" /> Google Maps
                </a>
              )}
            </div>
          </DialogHeader>
          <div className="w-full h-[440px] relative bg-gray-950">
            {isMapOpen && mapRoad?.geometry ? (
              <RoadMapViewer road={mapRoad} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <MapIcon className="w-10 h-10 opacity-20" />
              </div>
            )}
          </div>
          {mapRoad && (
            <div className="px-6 py-3 border-t border-gray-800 bg-gray-950/60 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-500">
              <span>
                <span className="text-gray-400 font-medium">ID:</span> #
                {mapRoad.id}
              </span>
              {mapRoad.length && (
                <span>
                  <span className="text-gray-400 font-medium">Panjang:</span>{" "}
                  {Math.round(mapRoad.length).toLocaleString()} m
                </span>
              )}
              <span>
                <span className="text-gray-400 font-medium">Kerentanan:</span>{" "}
                {vulnerabilityLabels[mapRoad.vulnerability]}
              </span>
              <span className="ml-auto italic text-gray-600">
                Warna garis = kondisi fisik
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Draw Modal (via portal) */}
      <DrawModal
        open={isDrawOpen}
        onClose={() => setIsDrawOpen(false)}
        editingRoute={editingRoute}
        onSaved={handleSaved}
      />
    </div>
  );
}
