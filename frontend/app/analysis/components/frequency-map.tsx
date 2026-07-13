"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-providers";
import type { GridCell } from "@/api/analysis";
import { analysisApi } from "@/api/analysis";
import { useTheme } from "next-themes";
import ReactDOMServer from 'react-dom/server';
import { AlertTriangle, CheckCircle2, BellRing, Calendar, ArrowDownToLine, MapPin } from "lucide-react";

interface FrequencyMapProps {
  grids: GridCell[];
  showBpbdLayer?: boolean;
  showEarthquakes?: boolean;
  earthquakes?: Array<{
    id: number;
    lat: number;
    lon: number;
    magnitude: number;
    time: string;
    location: string;
  }>;
  selectedEarthquakeId?: number | null;
}

// Helper to check if point is inside polygon (ray-casting)
const isPointInPolygon = (point: [number, number], vs: number[][]) => {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const isPointInMultiPolygon = (point: [number, number], geometry: any) => {
  if (!geometry || !geometry.type) return true;
  if (geometry.type === 'Polygon') {
    return isPointInPolygon(point, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (isPointInPolygon(point, polygon[0])) return true;
    }
  }
  return false;
};

export default function FrequencyMap({
  grids,
  showBpbdLayer = false,
  showEarthquakes = false,
  earthquakes = [],
  selectedEarthquakeId = null,
}: FrequencyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const bpbdLayerRef = useRef<L.GeoJSON | null>(null);
  const earthquakeLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const earthquakeMarkersRef = useRef<Map<number, L.Marker>>(new Map());
  const earthquakeCirclesRef = useRef<Map<number, L.LayerGroup>>(new Map());
  const activeCircleRef = useRef<L.LayerGroup | null>(null);
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
        preferCanvas: false,
      });

      L.control
        .zoom({
          position: "bottomleft",
        })
        .addTo(mapRef.current);

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

      // Add Bantul boundary outline
      boundaryLayerRef.current = L.geoJSON(bantulBoundary, {
        style: {
          color: "#2563eb",
          weight: 2,
          fillOpacity: 0,
          dashArray: "8, 4",
        },
      }).addTo(mapRef.current);

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

    // Add Polygon Village Layer (ONLY if BPBD layer is NOT shown)
    if (grids && grids.length > 0 && !showBpbdLayer) {
      if (!mapRef.current) return;
      
      const maxCount = Math.max(...grids.map(g => g.count));

      const geoJsonFeatures = grids
        .filter(grid => grid.geometry)
        .map(grid => ({
          type: "Feature",
          properties: {
            name: grid.grid_id,
            count: grid.count,
            level: grid.level
          },
          geometry: grid.geometry
        }));

      if (geoJsonFeatures.length === 0) return;

      const geoJsonData = {
        type: "FeatureCollection",
        features: geoJsonFeatures
      };

      const villageLayer = L.geoJSON(geoJsonData as any, {
        style: (feature) => {
          const count = feature?.properties?.count || 0;
          let fillColor = "#10b981"; // 0 count: Emerald Green (Aman)
          let opacity = 0.4;
          let strokeColor = "#047857";
          let strokeOpacity = 0.6;
          let weight = 0.8;

          if (feature?.properties?.level === "high") {
            fillColor = "#dc2626"; // Tinggi: Merah (red-600)
            opacity = 0.75;
            strokeColor = "#991b1b"; // Darker red border
            strokeOpacity = 0.8;
            weight = 1.2;
          } else if (feature?.properties?.level === "medium") {
            fillColor = "#f97316"; // Sedang: Orange (orange-500)
            opacity = 0.7;
            strokeColor = "#c2410c"; // Darker orange border
            strokeOpacity = 0.8;
            weight = 1;
          } else if (count > 0) { // low level 
            fillColor = "#eab308"; // Rendah: Yellow (yellow-500)
            opacity = 0.65;
            strokeColor = "#a16207"; // Darker yellow border
            strokeOpacity = 0.8;
            weight = 1;
          }

          return {
            fillColor: fillColor,
            weight: weight, 
            opacity: strokeOpacity, 
            color: strokeColor, 
            fillOpacity: opacity,
            className: 'transition-all duration-300 ease-in-out'
          };
        },
        onEachFeature: (feature, layer) => {
          const name = feature.properties.name || "Tidak diketahui";
          const count = feature.properties.count || 0;
          const level = feature.properties.level || "low";
          
          let levelBadge = "";
          let description = "";

          if (count > 0) {
             const levelColor = level === 'high' ? 'bg-red-100 text-red-700 border-red-200' : 
                                level === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                'bg-yellow-100 text-yellow-700 border-yellow-200';
             
             const levelText = level === 'high' ? 'Rawan Tinggi' : 
                               level === 'medium' ? 'Rawan Sedang' : 'Rawan Rendah';
             
             const iconElement = level === 'high' ? ReactDOMServer.renderToString(<AlertTriangle size={14} />) : 
                                 level === 'medium' ? ReactDOMServer.renderToString(<AlertTriangle size={14} />) : 
                                 ReactDOMServer.renderToString(<BellRing size={14} />);
             
             description = level === 'high' ? "Desa ini cukup sering menjadi titik pusat gempa." : 
                           level === 'medium' ? "Desa ini beberapa kali menjadi titik pusat gempa." : 
                           "Desa ini jarang menjadi titik pusat gempa, namun tetap harus waspada.";
             
             levelBadge = `
               <div class="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${levelColor}">
                  <span class="mr-1.5 flex items-center">${iconElement}</span> ${levelText}
               </div>`;
          } else {
             description = "Berdasarkan data saat ini, belum pernah tercatat ada pusat gempa di desa ini.";
             const checkIcon = ReactDOMServer.renderToString(<CheckCircle2 size={14} />);
             levelBadge = `
               <div class="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <span class="mr-1.5 flex items-center">${checkIcon}</span> Relatif Aman
               </div>`;
          }

          const popupContent = `
            <div class="font-sans min-w-[220px] max-w-[260px] text-slate-800 dark:text-zinc-200">
              <div class="border-b border-slate-100 dark:border-zinc-800 pb-2 mb-3">
                <h3 class="font-bold text-base tracking-wide uppercase text-slate-900 dark:text-zinc-50">Desa ${name}</h3>
              </div>
              
              <div class="space-y-3">
                <div>
                  <span class="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-0.5">Pusat Gempa Terjadi:</span>
                  <div class="flex items-baseline">
                    <span class="font-extrabold text-2xl text-slate-800 dark:text-zinc-100">${count}</span>
                    <span class="ml-1 text-sm text-slate-600 dark:text-zinc-400 font-medium">Kali Gempa</span>
                  </div>
                </div>
                
                <div>
                  <span class="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Tingkat Kerawanan Desa:</span>
                  ${levelBadge}
                </div>
              </div>
              
              <div class="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <p class="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-500 italic">
                  * ${description}
                </p>
              </div>
            </div>
          `;
          
          // Mengganti bindTooltip (hover) menjadi bindPopup (klik)
          layer.bindPopup(popupContent, {
            className: 'custom-leaflet-popup !rounded-xl',
            maxWidth: 280,
            closeButton: true
          });

          // Highlight on hover (hanya efek outline poligon saja, tooltip dihapus)
          layer.on({
            mouseover: (e) => {
              const target = e.target;
              // Simpan style asli sebelum diubah jika Leaflet belum men-tracknya
              if (!target.options.originalStyle) {
                target.options.originalStyle = {
                   weight: target.options.weight,
                   color: target.options.color,
                   fillOpacity: target.options.fillOpacity,
                   fillColor: target.options.fillColor,
                   opacity: target.options.opacity
                };
              }
              
              target.bringToFront();
              
              target.setStyle({
                weight: 2.5,
                color: '#1e293b', // Slate 800
                fillOpacity: 0.85,
              });
            },
            mouseout: (e) => {
              const target = e.target;
              // Memulihkan style dengan aman menghindari nyangkut
              if (target.options.originalStyle) {
                 target.setStyle(target.options.originalStyle);
              } else {
                 villageLayer.resetStyle(target);
              }
            }
          });
        }
      });

      villageLayer.addTo(mapRef.current);
      layersRef.current.push(villageLayer);

      // Focus map to all active grid points
      const activeGrids = grids.filter(g => g.count > 0);
      if (activeGrids.length > 0) {
        const bounds = activeGrids.map(
          (grid) => [grid.center.lat, grid.center.lon] as [number, number],
        );

        if (mapRef.current && bounds.length > 0) {
          mapRef.current.fitBounds(bounds, { padding: [80, 80] });
        }
      }
    }
  }, [grids, bantulBoundary, resolvedTheme, showBpbdLayer]);

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

              const colorHex = riskLevel.toLowerCase() === "rendah" ? "#10b981" : 
                               riskLevel.toLowerCase() === "sedang" ? "#f59e0b" : "#dc2626";
              
              const levelColor = riskLevel.toLowerCase() === "rendah" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : 
                                 riskLevel.toLowerCase() === "sedang" ? "bg-amber-100 text-amber-700 border-amber-200" : 
                                 "bg-red-100 text-red-700 border-red-200";

              layer.bindTooltip(`Risiko: ${riskLevel}`, {
                className: "custom-tooltip text-sm font-medium p-2",
                direction: "auto",
              });

              layer.bindPopup(
                `<div class="font-sans min-w-[200px] max-w-[240px] text-slate-800 dark:text-zinc-200">
                  <div class="border-b border-slate-100 dark:border-zinc-800 pb-2 mb-3">
                    <span class="text-[10px] font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase block mb-1">Area Rawan BPBD</span>
                    <h3 class="font-bold text-[15px] leading-snug text-slate-900 dark:text-zinc-50 uppercase">${desa}</h3>
                  </div>
                  
                  <div class="space-y-2">
                    <span class="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">Tingkat Risiko Bencana:</span>
                    <div class="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${levelColor}">
                      <div class="w-2 h-2 rounded-full mr-2" style="background-color: ${colorHex}"></div>
                      Risiko ${riskLevel}
                    </div>
                  </div>
                </div>`,
                {
                   className: 'custom-leaflet-popup !rounded-xl',
                   maxWidth: 260,
                   closeButton: true
                }
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

  // Manage Earthquake Markers visibility
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing earthquake layer
    if (earthquakeLayerRef.current) {
      mapRef.current.removeLayer(earthquakeLayerRef.current);
      earthquakeLayerRef.current = null;
    }

    if (showEarthquakes && earthquakes.length > 0) {
      earthquakeLayerRef.current = L.layerGroup();

      earthquakes.forEach((eq) => {
        const markerIcon = L.divIcon({
          className: "earthquake-marker",
          html: `
            <div style="position: relative; width: auto; display: flex; flex-direction: column; align-items: center;">
              <div style="
                width: 16px;
                height: 16px;
                background-color: #ef4444;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.6), 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
              ">
                <div style="width: 4px; height: 4px; background-color: white; border-radius: 50%;"></div>
              </div>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([eq.lat, eq.lon], {
          icon: markerIcon,
        });

        const baseRadius = Math.pow(eq.magnitude, 2.5) * 50;

        const redZone = L.circle([eq.lat, eq.lon], {
          radius: baseRadius,
          color: "#dc2626",
          fillColor: "#dc2626",
          fillOpacity: 0,
          weight: 0,
          opacity: 0,
          interactive: false,
        });

        const yellowZone = L.circle([eq.lat, eq.lon], {
          radius: baseRadius * 3,
          color: "#eab308",
          fillColor: "#eab308",
          fillOpacity: 0,
          weight: 0,
          opacity: 0,
          interactive: false,
        });

        const greenZone = L.circle([eq.lat, eq.lon], {
          radius: baseRadius * 6,
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0,
          weight: 0,
          opacity: 0,
          interactive: false,
        });

        const radiusGroup = L.layerGroup([greenZone, yellowZone, redZone]);
        radiusGroup.addTo(earthquakeLayerRef.current!);
        earthquakeCirclesRef.current.set(eq.id, radiusGroup);

          const calendarIcon = ReactDOMServer.renderToString(<Calendar size={14} />);
          const depthIcon = ReactDOMServer.renderToString(<ArrowDownToLine size={14} />);

          marker.bindPopup(
            `<div class="font-sans min-w-[240px] text-slate-800 dark:text-zinc-200">
              <div class="border-b border-slate-100 dark:border-zinc-800 pb-2 mb-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase">Titik Gempa</span>
                  <div class="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded text-xs font-extrabold shadow-sm">
                    M ${eq.magnitude.toFixed(1)}
                  </div>
                </div>
                <h3 class="font-bold text-[15px] leading-snug text-slate-900 dark:text-zinc-50 mt-2">${eq.location}</h3>
              </div>
              
              <div class="space-y-2.5">
                <div class="flex items-center gap-2">
                  <div class="w-6 flex justify-center text-slate-400 dark:text-zinc-500">${calendarIcon}</div>
                  <div>
                    <span class="block text-[10px] font-medium text-slate-500 dark:text-zinc-400 uppercase">Waktu Kejadian</span>
                    <span class="font-semibold text-slate-700 dark:text-zinc-300 text-sm">
                      ${new Date(eq.time).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} WIB
                    </span>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <div class="w-6 flex justify-center text-slate-400 dark:text-zinc-500">${depthIcon}</div>
                  <div>
                    <span class="block text-[10px] font-medium text-slate-500 dark:text-zinc-400 uppercase">Kedalaman</span>
                    <span class="font-semibold text-slate-700 dark:text-zinc-300 text-sm">${(eq as any).depth !== undefined ? (eq as any).depth + ' km' : "Tidak diketahui"}</span>
                  </div>
                </div>
              </div>
            </div>`,
            {
               className: 'custom-leaflet-popup !rounded-xl',
               maxWidth: 280,
               closeButton: true
            }
          );

        earthquakeMarkersRef.current.set(eq.id, marker);
        marker.addTo(earthquakeLayerRef.current!);
      });

      earthquakeLayerRef.current.addTo(mapRef.current);
    }
  }, [showEarthquakes, earthquakes]);

  // Handle flyTo when an earthquake is selected
  useEffect(() => {
    if (selectedEarthquakeId && mapRef.current && showEarthquakes) {
      if (activeCircleRef.current) {
        activeCircleRef.current.eachLayer((layer) => {
          const pathLayer = layer as L.Path;
          if (pathLayer.setStyle) {
            pathLayer.setStyle({ fillOpacity: 0, weight: 0, opacity: 0 });
          }
        });
      }

      const marker = earthquakeMarkersRef.current.get(selectedEarthquakeId);
      if (marker) {
        mapRef.current.flyTo(marker.getLatLng(), 12, {
          duration: 1.5,
        });
        
        const radiusGroup = earthquakeCirclesRef.current.get(selectedEarthquakeId);
        if (radiusGroup) {
          radiusGroup.eachLayer((layer) => {
            if (layer instanceof L.Circle) {
              const circleLayer = layer as L.Circle;
              const color = (circleLayer.options as any).color as string;
              if (color === "#dc2626")
                circleLayer.setStyle({ fillOpacity: 0.25, weight: 2, opacity: 0.8 });
              else if (color === "#eab308")
                circleLayer.setStyle({ fillOpacity: 0.15, weight: 2, opacity: 0.6 });
              else if (color === "#22c55e")
                circleLayer.setStyle({ fillOpacity: 0.1, weight: 1.5, opacity: 0.4 });
            }
          });
          activeCircleRef.current = radiusGroup;
        }

        // Wait for flyTo to finish before opening popup
        setTimeout(() => {
          marker.openPopup();
        }, 1500);
      }
    }
  }, [selectedEarthquakeId, showEarthquakes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Defer cleanup to next frame to avoid canvas errors
      const cleanupMap = () => {
        if (mapRef.current) {
          try {
            // Remove all layers
            layersRef.current.forEach((layer: any) => {
              try {
                if (mapRef.current && mapRef.current.hasLayer(layer)) {
                  mapRef.current.removeLayer(layer);
                }
              } catch (e) {
                // Ignore layer removal errors
              }
            });
            layersRef.current = [];

            try {
              if (boundaryLayerRef.current && mapRef.current.hasLayer(boundaryLayerRef.current)) {
                mapRef.current.removeLayer(boundaryLayerRef.current);
              }
            } catch (e) {}

            try {
              if (maskLayerRef.current && mapRef.current.hasLayer(maskLayerRef.current)) {
                mapRef.current.removeLayer(maskLayerRef.current);
              }
            } catch (e) {}

            try {
              if (bpbdLayerRef.current && mapRef.current.hasLayer(bpbdLayerRef.current)) {
                mapRef.current.removeLayer(bpbdLayerRef.current);
              }
            } catch (e) {}

            try {
              if (earthquakeLayerRef.current && mapRef.current.hasLayer(earthquakeLayerRef.current)) {
                mapRef.current.removeLayer(earthquakeLayerRef.current);
              }
            } catch (e) {}

            // Remove map
            try {
              mapRef.current.remove();
            } catch (e) {}
          } catch (error) {
            console.warn("Map cleanup error:", error);
          }
          mapRef.current = null;
        }
      };

      // Use requestAnimationFrame to defer cleanup
      requestAnimationFrame(() => {
        setTimeout(cleanupMap, 0);
      });
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
