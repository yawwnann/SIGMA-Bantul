"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-providers";
if (typeof window !== "undefined") {
  require("leaflet.heat");
}
import type { GridCell } from "@/api/analysis";
import { analysisApi } from "@/api/analysis";
import { useTheme } from "next-themes";

interface FrequencyMapProps {
  grids: GridCell[];
  showBpbdLayer?: boolean;
}

export default function FrequencyMap({
  grids,
  showBpbdLayer = false,
}: FrequencyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const bpbdLayerRef = useRef<L.GeoJSON | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [bantulBoundary, setBantulBoundary] = useState<any>(null);
  const [bpbdData, setBpbdData] = useState<any>(null);
  const { resolvedTheme } = useTheme();

  // Fetch Bantul boundary on mount
  useEffect(() => {
    const fetchBoundary = async () => {
      try {
        const boundary = await analysisApi.getBantulBoundary();
        setBantulBoundary(boundary);
      } catch (error) {
        console.error("Failed to load Bantul boundary:", error);
      }
    };
    fetchBoundary();
  }, []);

  // Fetch BPBD Risk data when toggle is ON
  useEffect(() => {
    if (showBpbdLayer && !bpbdData) {
      const fetchBpbdRisk = async () => {
        try {
          const data = await analysisApi.getBpbdRisk();
          setBpbdData(data);
        } catch (error) {
          console.error("Failed to load BPBD risk data:", error);
        }
      };
      fetchBpbdRisk();
    }
  }, [showBpbdLayer, bpbdData]);

  useEffect(() => {
    if (!mapContainerRef.current || !bantulBoundary) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [-7.88, 110.38],
        zoom: 11,
        zoomControl: false,
        preferCanvas: true,
      });

      L.control
        .zoom({
          position: "bottomleft",
        })
        .addTo(mapRef.current);

      // Set initial tile based on current theme - using free tile providers
      // Default to light mode tile if resolvedTheme isn't ready
      const initialTile =
        resolvedTheme === "dark" ? "CartoDB.DarkMatter" : "CartoDB.Positron";
      tileLayerRef.current = (
        L.tileLayer as unknown as {
          provider: (
            name: string,
            options?: Record<string, unknown>,
          ) => L.TileLayer;
        }
      )
        .provider(initialTile, { maxZoom: 19 })
        .addTo(mapRef.current);

      // Extract boundary coordinates from GeoJSON
      const feature = bantulBoundary.features[0];
      const geometry = feature.geometry;

      // Calculate bounds for mask layer
      let minLon = Infinity,
        maxLon = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;

      // Get bounds from all polygons in MultiPolygon
      if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((polygon: number[][][]) => {
          polygon[0].forEach((coord: number[]) => {
            minLon = Math.min(minLon, coord[0]);
            maxLon = Math.max(maxLon, coord[1]);
            minLat = Math.min(minLat, coord[1]);
            maxLat = Math.max(maxLat, coord[1]);
          });
        });
      }

      // Create larger bounds for mask
      const padding = 0.3;
      const worldBounds: [number, number][] = [
        [minLon - padding, minLat - padding],
        [maxLon + padding, minLat - padding],
        [maxLon + padding, maxLat + padding],
        [minLon - padding, maxLat + padding],
        [minLon - padding, minLat - padding],
      ];

      // Convert all polygons to holes for the mask
      const holes: [number, number][][] = [];
      if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach((polygon: number[][][]) => {
          const hole = polygon[0].map(
            (coord: number[]) => [coord[1], coord[0]] as [number, number],
          );
          holes.push(hole);
        });
      }

      // Create mask with multiple holes
      maskLayerRef.current = L.polygon([worldBounds, ...holes], {
        color: "transparent",
        fillColor: "#000000",
        fillOpacity: 0.2,
        interactive: false,
      }).addTo(mapRef.current);

      // Add Bantul boundary as GeoJSON layer
      boundaryLayerRef.current = L.geoJSON(bantulBoundary, {
        style: {
          color: "#2563eb",
          weight: 2,
          fillOpacity: 0,
          dashArray: "8, 4",
        },
      }).addTo(mapRef.current);

      // Fit map to boundary
      if (boundaryLayerRef.current) {
        mapRef.current.fitBounds(boundaryLayerRef.current.getBounds(), {
          padding: [30, 30],
        });
      }
    }

    // Clear existing polygon layers
    layersRef.current.forEach((layer: any) => {
      if (mapRef.current && mapRef.current.hasLayer(layer)) {
        mapRef.current.removeLayer(layer);
      }
    });
    layersRef.current = [];

    // Add Grid Heatmap Layer
    if (grids && grids.length > 0) {
      if (!mapRef.current) return;

      // Only include grids with actual earthquakes (count > 0)
      const activeGrids = grids.filter((grid) => grid.count > 0);

      if (activeGrids.length === 0) return;

      // Extract points for heat map: [lat, lon, intensity]
      const heatPoints: [number, number, number][] = activeGrids.map((grid) => [
        grid.center.lat,
        grid.center.lon,
        grid.count * 10,
      ]);

      const maxIntensity = Math.max(
        ...activeGrids.map((g) => g.count * 10),
        10,
      );

      // Cast L to any because leaflet.heat adds heatLayer to L namespace
      const heatLayer = (L as any).heatLayer(heatPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 14,
        max: maxIntensity,
        gradient: {
          0.0: "rgba(255,255,0,0)", // transparent
          0.3: "#fef08a", // yellow-200
          0.6: "#f97316", // orange-500
          0.85: "#ef4444", // red-500
          1.0: "#991b1b", // red-800
        },
      });

      heatLayer.addTo(mapRef.current);
      layersRef.current.push(heatLayer);

      // Fit bounds to show all grids with padding
      const bounds = grids.map(
        (grid) => [grid.center.lat, grid.center.lon] as [number, number],
      );

      if (mapRef.current && bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [80, 80] });
      }
    }
  }, [grids, bantulBoundary]);

  // Manage BPBD Layer visibility
  useEffect(() => {
    if (!mapRef.current || !bpbdData) return;

    if (showBpbdLayer) {
      if (!bpbdLayerRef.current) {
        bpbdLayerRef.current = L.geoJSON(bpbdData, {
          style: (feature) => {
            const riskLevel = feature?.properties?.bahaya?.toLowerCase();
            let color = "#ef4444"; // Default tinggi
            if (riskLevel === "rendah") color = "#22c55e";
            else if (riskLevel === "sedang") color = "#f59e0b";

            return {
              color: color,
              weight: 1,
              fillColor: color,
              fillOpacity: 0.3,
            };
          },
          onEachFeature: (feature, layer) => {
            const riskLevel = feature.properties?.bahaya || "Tidak diketahui";
            const desa =
              feature.properties?.desa ||
              feature.properties?.desa_2 ||
              "Tidak diketahui";

            layer.bindTooltip(`Risiko: ${riskLevel}`, {
              className: "custom-tooltip text-sm font-medium p-2",
              direction: "auto",
            });

            layer.bindPopup(
              `<div class="p-2 min-w-[150px]">
                <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Area BPBD</p>
                <p class="font-bold text-slate-800 mb-1">${desa}</p>
                <div class="flex items-center gap-1.5 mt-2">
                  <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${
                    riskLevel.toLowerCase() === "rendah"
                      ? "#22c55e"
                      : riskLevel.toLowerCase() === "sedang"
                        ? "#f59e0b"
                        : "#ef4444"
                  }"></div>
                  <p class="text-sm font-medium">Tingkat Risiko: ${riskLevel}</p>
                </div>
              </div>`,
            );
          },
        });
      }

      // Ensure layer is added
      if (!mapRef.current.hasLayer(bpbdLayerRef.current)) {
        bpbdLayerRef.current.addTo(mapRef.current);
      }
    } else {
      // Remove layer if it exists
      if (
        bpbdLayerRef.current &&
        mapRef.current.hasLayer(bpbdLayerRef.current)
      ) {
        mapRef.current.removeLayer(bpbdLayerRef.current);
      }
    }
  }, [showBpbdLayer, bpbdData]);

  // Handle Theme Changes for Tiles
  useEffect(() => {
    if (!mapRef.current) return;

    // Use free tile providers that don't require API keys
    // Default to light mode tile if resolvedTheme isn't ready
    const tileName =
      resolvedTheme === "dark" ? "CartoDB.DarkMatter" : "CartoDB.Positron";

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = (
      L.tileLayer as unknown as {
        provider: (
          name: string,
          options?: Record<string, unknown>,
        ) => L.TileLayer;
      }
    )
      .provider(tileName, {
        maxZoom: 19,
      })
      .addTo(mapRef.current);
  }, [resolvedTheme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        // Remove all layers
        layersRef.current.forEach((layer: any) => {
          if (mapRef.current && mapRef.current.hasLayer(layer)) {
            mapRef.current.removeLayer(layer);
          }
        });
        layersRef.current = [];

        if (
          boundaryLayerRef.current &&
          mapRef.current.hasLayer(boundaryLayerRef.current)
        ) {
          mapRef.current.removeLayer(boundaryLayerRef.current);
        }

        if (
          maskLayerRef.current &&
          mapRef.current.hasLayer(maskLayerRef.current)
        ) {
          mapRef.current.removeLayer(maskLayerRef.current);
        }

        if (
          bpbdLayerRef.current &&
          mapRef.current.hasLayer(bpbdLayerRef.current)
        ) {
          mapRef.current.removeLayer(bpbdLayerRef.current);
        }

        // Remove map
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .custom-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
          padding: 0 !important;
        }
        .custom-tooltip::before {
          border-top-color: white !important;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </>
  );
}

// Unused functions removed for Heatmap
