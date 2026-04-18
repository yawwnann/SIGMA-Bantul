"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  Shelter,
  HazardZone,
  Earthquake,
  PublicFacility,
} from "@/types";
import { analysisApi } from "@/api/analysis";
import { Filter, X } from "lucide-react";
import { useTheme } from "next-themes";
import "leaflet-providers";

interface MapClientProps {
  shelters: Shelter[];
  hazardZones: HazardZone[];
  earthquakes: Earthquake[];
  facilities: PublicFacility[];
  selectedLocation: { lat: number; lng: number } | null;
  onLocationSelect: (lat: number, lng: number) => void;
  onEarthquakeClick?: (earthquake: Earthquake) => void;
  onCalculateRoute?: (
    shelterLat: number,
    shelterLng: number,
    shelterName: string,
  ) => void;
  roadNetwork?: any;
  calculatedRoute?: any;
}

const BANTUL_CENTER: [number, number] = [-7.888, 110.33];

function createShelterIcon(condition: string) {
  const color =
    condition === "GOOD"
      ? "#22c55e"
      : condition === "MODERATE"
        ? "#eab308"
        : "#ef4444";
  const shadowColor = condition === 'GOOD' ? 'rgba(34, 197, 94, 0.4)' : condition === 'MODERATE' ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  return L.divIcon({
    className: "custom-marker",
    html: `
    <div style="display:flex; flex-direction:column; align-items:center;">
      <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; border: 2.5px solid white; box-shadow: 0 4px 8px ${shadowColor}; display:flex; align-items:center; justify-content:center; transform: rotate(-45deg);">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="14" height="14" style="transform: rotate(45deg);">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
      </div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

function createFacilityIcon(type: string) {
  const colors: Record<string, string> = {
    HOSPITAL: "#ef4444",
    SCHOOL: "#3b82f6",
    HEALTH_CENTER: "#22c55e",
    VILLAGE_OFFICE: "#8b5cf6",
    MARKET: "#f59e0b",
    MOSQUE: "#06b6d4",
    CHURCH: "#6366f1",
  };
  const color = colors[type] || "#6b7280";
  return L.divIcon({
    className: "custom-marker",
    html: `
    <div style="display:flex; flex-direction:column; align-items:center;">
      <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; transform: rotate(-45deg);">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" style="transform: rotate(45deg);">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      </div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

export default function MapClient({
  shelters,
  hazardZones,
  earthquakes,
  facilities,
  selectedLocation,
  onLocationSelect,
  onEarthquakeClick,
  onCalculateRoute,
  roadNetwork,
  calculatedRoute,
}: MapClientProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const hazardLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const roadLayerRef = useRef<L.GeoJSON | null>(null);
  const calculatedRouteLayerRef = useRef<L.GeoJSON | null>(null);
  const activeCircleRef = useRef<L.LayerGroup | null>(null);
  const earthquakeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const shelterLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const facilityLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const earthquakeCirclesRef = useRef<Map<number, L.LayerGroup>>(new Map());
  const locationMarkerRef = useRef<L.Marker | null>(null);
  const [bantulBoundary, setBantulBoundary] = useState<any>(null);
  const [visibleLayers, setVisibleLayers] = useState({
    boundary: true,
    shelters: true,
    hazardZones: false,
    earthquakes: true,
    facilities: true,
    roads: false,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const tileLayerRef = useRef<L.TileLayer | null>(null);

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

  const onLocationSelectRef = useRef(onLocationSelect);
  const onEarthquakeClickRef = useRef(onEarthquakeClick);
  const onCalculateRouteRef = useRef(onCalculateRoute);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    onEarthquakeClickRef.current = onEarthquakeClick;
    onCalculateRouteRef.current = onCalculateRoute;
  }, [onLocationSelect, onEarthquakeClick, onCalculateRoute]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: BANTUL_CENTER,
      zoom: 12,
      zoomControl: false,
      preferCanvas: true,
    });

    L.control.zoom({
      position: "bottomleft",
    }).addTo(mapRef.current);

    earthquakeLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    shelterLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    facilityLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    hazardLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);

    // Add click handler for map
    mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
      if (onLocationSelectRef.current) {
        onLocationSelectRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    
    // Default to light mode tile if resolvedTheme isn't ready
    const tileName = resolvedTheme === "dark" ? "Stadia.AlidadeSmoothDark" : "Stadia.AlidadeSmooth";

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    
    tileLayerRef.current = (L.tileLayer as any).provider(tileName, {
      maxZoom: 19,
    }).addTo(mapRef.current);

  }, [resolvedTheme]);

  useEffect(() => {
    if (!mapRef.current || !bantulBoundary) return;

    if (boundaryLayerRef.current) {
      mapRef.current.removeLayer(boundaryLayerRef.current);
    }
    if (maskLayerRef.current) {
      mapRef.current.removeLayer(maskLayerRef.current);
    }

    if (!visibleLayers.boundary) return;

    const feature = bantulBoundary.features[0];
    const geometry = feature.geometry;

    let minLon = Infinity,
      maxLon = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;

    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon[0].forEach((coord: number[]) => {
          minLon = Math.min(minLon, coord[0]);
          maxLon = Math.max(maxLon, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        });
      });
    }

    const padding = 0.3;
    const worldBounds: [number, number][] = [
      [minLon - padding, minLat - padding],
      [maxLon + padding, minLat - padding],
      [maxLon + padding, maxLat + padding],
      [minLon - padding, maxLat + padding],
      [minLon - padding, minLat - padding],
    ];

    const holes: [number, number][][] = [];
    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        const hole = polygon[0].map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number],
        );
        holes.push(hole);
      });
    }

    maskLayerRef.current = L.polygon([worldBounds, ...holes], {
      color: "transparent",
      fillColor: "#000000",
      fillOpacity: 0.2,
      interactive: false,
    }).addTo(mapRef.current);

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
  }, [bantulBoundary, visibleLayers.boundary]);

  useEffect(() => {
    if (!mapRef.current || !shelterLayerGroupRef.current) return;

    shelterLayerGroupRef.current.clearLayers();

    if (!visibleLayers.shelters) return;

    shelters.forEach((shelter) => {
      const coords = shelter.geometry as { coordinates: [number, number] };
      if (coords?.coordinates) {
        const marker = L.marker(
          [coords.coordinates[1], coords.coordinates[0]],
          {
            icon: createShelterIcon(shelter.condition),
          },
        ).addTo(shelterLayerGroupRef.current!);

        // Create popup with route button
        const popupContent = `
          <div class="p-3 min-w-[200px]">
            <h3 class="font-bold text-lg mb-2">${shelter.name}</h3>
            <div class="space-y-1 mb-3">
              <p class="text-sm"><strong>Kapasitas:</strong> ${shelter.capacity} orang</p>
              <p class="text-sm"><strong>Kondisi:</strong> ${shelter.condition}</p>
              ${shelter.address ? `<p class="text-sm"><strong>Alamat:</strong> ${shelter.address}</p>` : ""}
            </div>
            <button 
              id="route-btn-${shelter.id}"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Hitung Rute
            </button>
          </div>
        `;

        const popup = marker.bindPopup(popupContent, {
          maxWidth: 250,
          className: "custom-popup",
        });

        popup.on("popupopen", () => {
          const routeBtn = document.getElementById(`route-btn-${shelter.id}`);
          if (routeBtn) {
            routeBtn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onCalculateRouteRef.current) {
                onCalculateRouteRef.current(
                  coords.coordinates[1],
                  coords.coordinates[0],
                  shelter.name,
                );
              }
            });
          }
        });
      }
    });
  }, [shelters, visibleLayers.shelters]);

  useEffect(() => {
    if (!mapRef.current || !facilityLayerGroupRef.current) return;

    facilityLayerGroupRef.current.clearLayers();

    if (!visibleLayers.facilities) return;

    facilities.forEach((facility) => {
      if (!facility.geometry) return;
      const coords = facility.geometry as { coordinates: [number, number] };
      if (
        coords?.coordinates &&
        Array.isArray(coords.coordinates) &&
        coords.coordinates.length >= 2
      ) {
        L.marker([coords.coordinates[1], coords.coordinates[0]], {
          icon: createFacilityIcon(facility.type),
        }).addTo(facilityLayerGroupRef.current!).bindPopup(`
            <div class="p-2">
              <h3 class="font-bold">${facility.name}</h3>
              <p class="text-sm">Jenis: ${facility.type}</p>
              ${facility.address ? `<p class="text-sm">Alamat: ${facility.address}</p>` : ""}
            </div>
          `);
      }
    });
  }, [facilities, visibleLayers.facilities]);

  useEffect(() => {
    if (!mapRef.current || !earthquakeLayerGroupRef.current) return;

    earthquakeLayerGroupRef.current.clearLayers();
    earthquakeCirclesRef.current.clear();

    if (!visibleLayers.earthquakes || earthquakes.length === 0) return;

    earthquakes
      .filter((eq) => eq.magnitude != null && eq.lat != null && eq.lon != null)
      .forEach((eq) => {
        // Konsep Radius: Red (Dampak Keras), Yellow (Menengah), Green (Terasa ringan)
        // Perhitungan radius berdasar perpangkatan magnitudo agar lebih logis
        const baseRadius = Math.pow(eq.magnitude, 2.5) * 50;

        const redZone = L.circle([eq.lat, eq.lon], {
          radius: baseRadius,
          color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0, weight: 0, opacity: 0, interactive: false,
        });

        const yellowZone = L.circle([eq.lat, eq.lon], {
          radius: baseRadius * 3,
          color: "#eab308", fillColor: "#eab308", fillOpacity: 0, weight: 0, opacity: 0, interactive: false,
        });

        const greenZone = L.circle([eq.lat, eq.lon], {
          radius: baseRadius * 6,
          color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0, weight: 0, opacity: 0, interactive: false,
        });

        const radiusGroup = L.layerGroup([greenZone, yellowZone, redZone]).addTo(earthquakeLayerGroupRef.current!);

        // Store circle reference
        earthquakeCirclesRef.current.set(eq.id, radiusGroup);

        const markerIcon = L.divIcon({
          className: "earthquake-marker",
          html: `
            <div style="position: relative; width: auto; display: flex; flex-direction: column; align-items: center;">
              <div style="
                width: 20px;
                height: 20px;
                background-color: #ef4444;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.8), 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: relative;
                z-index: 10;
              ">
                <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
              </div>
              <div style="
                margin-top: 4px;
                background: rgba(24, 24, 27, 0.85); /* zinc-900 with opacity */
                backdrop-filter: blur(4px);
                padding: 3px 8px;
                border-radius: 12px;
                font-weight: 700;
                font-size: 11px;
                color: #fca5a5; /* red-300 */
                border: 1px solid rgba(248, 113, 113, 0.3); /* border-red-400 */
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                cursor: pointer;
              ">
                M ${eq.magnitude.toFixed(1)}
              </div>
            </div>
          `,
          iconSize: [60, 60],
          iconAnchor: [30, 10],
        });

        const marker = L.marker([eq.lat, eq.lon], {
          icon: markerIcon,
        }).addTo(earthquakeLayerGroupRef.current!);

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);

          // Hide all circles first
          earthquakeCirclesRef.current.forEach((group) => {
            group.eachLayer((layer: any) => layer.setStyle({
              fillOpacity: 0,
              weight: 0,
              opacity: 0,
            }));
          });

          // Show current circles immediately
          redZone.setStyle({ fillOpacity: 0.25, weight: 2, opacity: 0.8 });
          yellowZone.setStyle({ fillOpacity: 0.15, weight: 2, opacity: 0.6 });
          greenZone.setStyle({ fillOpacity: 0.1, weight: 1.5, opacity: 0.4 });
          
          activeCircleRef.current = radiusGroup;

          // Call earthquake click handler
          if (onEarthquakeClickRef.current) {
            onEarthquakeClickRef.current(eq);
          }
        });
      });

    const hideRadiusHandler = () => {
      if (activeCircleRef.current) {
        activeCircleRef.current.eachLayer((layer: any) => {
          layer.setStyle({
            fillOpacity: 0,
            weight: 0,
            opacity: 0,
          });
        });
        activeCircleRef.current = null;
      }
    };
    window.addEventListener("hideEarthquakeRadius", hideRadiusHandler);

    return () => {
      window.removeEventListener("hideEarthquakeRadius", hideRadiusHandler);
    };
  }, [earthquakes, visibleLayers.earthquakes]);

  useEffect(() => {
    if (!mapRef.current || !hazardLayerGroupRef.current) return;

    hazardLayerGroupRef.current.clearLayers();

    if (!visibleLayers.hazardZones) return;

    hazardZones.forEach((zone) => {
      if (!zone.geometry || typeof zone.geometry !== "object") return;
      const color =
        zone.level === "CRITICAL"
          ? "#dc2626"
          : zone.level === "HIGH"
            ? "#f97316"
            : zone.level === "MEDIUM"
              ? "#eab308"
              : "#22c55e";
      try {
        L.geoJSON(zone.geometry as GeoJSON.GeoJsonObject, {
          style: {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2,
          },
        }).addTo(hazardLayerGroupRef.current!).bindPopup(`
            <div class="p-2">
              <h3 class="font-bold">${zone.name}</h3>
              <p class="text-sm">Level: ${zone.level}</p>
              ${zone.description ? `<p class="text-sm">${zone.description}</p>` : ""}
            </div>
          `);
      } catch (e) {
        console.warn("Invalid GeoJSON geometry for hazard zone:", zone.id);
      }
    });
  }, [hazardZones, visibleLayers.hazardZones]);



  useEffect(() => {
    if (!mapRef.current) return;

    if (locationMarkerRef.current) {
      mapRef.current.removeLayer(locationMarkerRef.current);
      locationMarkerRef.current = null;
    }

    if (selectedLocation) {
      locationMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: L.divIcon({
          className: "selected-location",
          html: '<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      }).addTo(mapRef.current)
        .bindPopup(
          `Lokasi Terpilih: ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
        );

      const currentZoom = mapRef.current.getZoom();
      const targetZoom = Math.max(currentZoom, 15);
      
      mapRef.current.flyTo([selectedLocation.lat, selectedLocation.lng], targetZoom, {
        duration: 1.5,
      });
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (!mapRef.current || !roadNetwork) return;

    if (roadLayerRef.current) {
      mapRef.current.removeLayer(roadLayerRef.current);
      roadLayerRef.current = null;
    }

    if (!visibleLayers.roads) return;

    roadLayerRef.current = L.geoJSON(roadNetwork, {
      style: (feature) => {
        const type = feature?.properties?.type || "LOCAL";
        const condition = feature?.properties?.condition || "GOOD";

        let color = "#94a3b8";
        if (type === "NATIONAL") color = "#ef4444";
        else if (type === "PROVINCIAL") color = "#f97316";
        else if (type === "REGIONAL") color = "#eab308";

        let opacity = 0.7;
        if (condition === "POOR") opacity = 0.5;
        else if (condition === "MODERATE") opacity = 0.6;

        let weight = 2;
        if (type === "NATIONAL") weight = 4;
        else if (type === "PROVINCIAL") weight = 3;

        return {
          color,
          weight,
          opacity,
        };
      },
    })
      .addTo(mapRef.current)
      .bindPopup((layer: any) => {
        const props = layer.feature.properties;
        return `
        <div class="p-2">
          <h3 class="font-bold">${props.name || "Jalan"}</h3>
          <p class="text-sm">Tipe: ${props.type}</p>
          <p class="text-sm">Kondisi: ${props.condition}</p>
        </div>
      `;
      });
  }, [roadNetwork, visibleLayers.roads]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (calculatedRouteLayerRef.current) {
      mapRef.current.removeLayer(calculatedRouteLayerRef.current);
      calculatedRouteLayerRef.current = null;
    }

    if (!calculatedRoute) return;

    const routeGroup = L.layerGroup();

    // Solid outline/shadow base
    L.geoJSON(calculatedRoute, {
      style: (feature) => {
        const isPrimary = feature?.properties?.routeId !== 'ALTERNATIVE';
        return {
          color: isPrimary ? "#1d4ed8" : "#94a3b8", // blue-700 vs slate-400
          weight: isPrimary ? 6 : 5,
          opacity: isPrimary ? 0.7 : 0.6,
        };
      },
      interactive: false,
    }).addTo(routeGroup);

    // Animated dashed line on top for primary, distinct dash for alternative
    const topLayer = L.geoJSON(calculatedRoute, {
      style: (feature) => {
        const isPrimary = feature?.properties?.routeId !== 'ALTERNATIVE';
        return {
          color: isPrimary ? "#93c5fd" : "#f1f5f9", // blue-300 vs slate-100
          weight: isPrimary ? 3 : 2,
          opacity: 1,
          dashArray: isPrimary ? undefined : "6, 12",
          className: isPrimary ? "route-animated-dash" : "", 
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const isPrimary = props.routeId !== 'ALTERNATIVE';
        const distKm = props.totalDistance / 1000;
        const bikeTime = Math.ceil((distKm / 40) * 60);

        const tooltipHtml = `
          <div class="flex flex-col items-center px-1">
            <div class="font-bold flex items-center gap-1 ${isPrimary ? 'text-blue-700' : 'text-slate-600'} text-[13px] leading-none mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
              ${bikeTime} mnt
            </div>
            <div class="text-slate-500 text-[11px] font-semibold leading-none">
              ${distKm.toFixed(1)} km
            </div>
          </div>
        `;

        layer.bindTooltip(tooltipHtml, {
          permanent: true,
          direction: 'center',
          className: 'route-floating-tooltip shadow-md'
        });
      }
    }).addTo(routeGroup);

    topLayer.bindPopup((layer: any) => {
        const props = layer.feature.properties;
        const isPrimary = props.routeId !== 'ALTERNATIVE';
        const distKm = props.totalDistance / 1000;
        const walkTime = (distKm / 5) * 60; // Asumsi jalan kaki 5 km/jam
        const bikeTime = (distKm / 40) * 60; // Asumsi motor 40 km/jam
        const carTime = (distKm / 30) * 60; // Asumsi mobil 30 km/jam (kepadatan rute darurat)

        return `
        <div class="px-2 pt-1 pb-4 w-[260px]">
          <div class="flex items-center gap-2 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            <h3 class="font-bold text-[15px] text-slate-800 dark:text-slate-100">Detail Rute Evakuasi</h3>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isPrimary ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">
              ${isPrimary ? 'JALUR UTAMA' : 'ALTERNATIF'}
            </span>
          </div>
          <div class="space-y-3 mt-2">
            <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-2 rounded-lg">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Jarak Jangkauan</span>
              <span class="font-bold text-sm text-slate-800 dark:text-slate-100">${distKm.toFixed(2)} km</span>
            </div>
            
            <div class="pt-2">
               <span class="font-bold text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 block">Estimasi Waktu Tempuh</span>
               <div class="grid grid-cols-3 gap-2">
                 <div class="flex flex-col items-center justify-center bg-green-50/50 dark:bg-green-900/10 rounded-lg p-2.5 border border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1.5"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/></svg>
                   <span class="font-bold text-sm leading-none">${Math.ceil(walkTime)}<span class="text-[10px] font-normal">'</span></span>
                   <span class="text-[10px] font-medium mt-1">Jalan</span>
                 </div>
                 <div class="flex flex-col items-center justify-center bg-orange-50/50 dark:bg-orange-900/10 rounded-lg p-2.5 border border-orange-100 dark:border-orange-900/50 text-orange-600 dark:text-orange-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1.5"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
                   <span class="font-bold text-sm leading-none">${Math.ceil(bikeTime)}<span class="text-[10px] font-normal">'</span></span>
                   <span class="text-[10px] font-medium mt-1">Motor</span>
                 </div>
                 <div class="flex flex-col items-center justify-center bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-2.5 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                   <span class="font-bold text-sm leading-none">${Math.ceil(carTime)}<span class="text-[10px] font-normal">'</span></span>
                   <span class="text-[10px] font-medium mt-1">Mobil</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      `;
      });

    routeGroup.addTo(mapRef.current);
    calculatedRouteLayerRef.current = routeGroup as any;

    if (topLayer) {
      mapRef.current.flyToBounds(topLayer.getBounds(), {
        padding: [80, 80],
        duration: 1.5,
      });
    }
  }, [calculatedRoute]);

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="relative w-full h-full text-left">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 md:left-4 z-[1000] flex flex-col items-start gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
          className="bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 dark:border-zinc-800/60 p-2.5 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-2"
        >
          {isFilterOpen ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          <span className="text-xs font-bold uppercase tracking-wider">{isFilterOpen ? "Tutup Filter" : "Filter Map"}</span>
        </button>

        {isFilterOpen && (
          <div className="bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800/60 p-4 w-[180px] transition-all animate-in fade-in slide-in-from-top-2">
            <h3 className="font-bold text-[11px] uppercase tracking-wider mb-3 text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-800/50 pb-2">
              Layer Aktif
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors">
                  Batas Wilayah
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.boundary}
                  onChange={() => toggleLayer("boundary")}
                  className="rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-slate-50 dark:bg-zinc-900"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors">
                  Shelter
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.shelters}
                  onChange={() => toggleLayer("shelters")}
                  className="rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-slate-50 dark:bg-zinc-900"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors">
                  Zona Rawan
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.hazardZones}
                  onChange={() => toggleLayer("hazardZones")}
                  className="rounded border-slate-300 dark:border-zinc-700 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer bg-slate-50 dark:bg-zinc-900"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors">
                  Titik Gempa
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.earthquakes}
                  onChange={() => toggleLayer("earthquakes")}
                  className="rounded border-slate-300 dark:border-zinc-700 text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer bg-slate-50 dark:bg-zinc-900"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors">
                  Fasilitas
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.facilities}
                  onChange={() => toggleLayer("facilities")}
                  className="rounded border-slate-300 dark:border-zinc-700 text-green-600 focus:ring-green-500 w-3.5 h-3.5 cursor-pointer bg-slate-50 dark:bg-zinc-900"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-zinc-100 transition-colors">
                  List Jalan
                </span>
                <input
                  type="checkbox"
                  checked={visibleLayers.roads}
                  onChange={() => toggleLayer("roads")}
                  className="rounded border-slate-300 dark:border-zinc-700 text-slate-600 focus:ring-slate-500 w-3.5 h-3.5 cursor-pointer bg-slate-50 dark:bg-zinc-900"
                />
              </label>
            </div>

            {visibleLayers.earthquakes && earthquakes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800/60">
                <h4 className="text-[10px] uppercase font-bold text-slate-700 dark:text-zinc-400 mb-2 tracking-wider">
                  Legenda Gempa
                </h4>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white dark:border-zinc-900 shadow-sm"></div>
                    <span className="font-medium">Pusat gempa</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-red-500/50 bg-red-500/10"></div>
                    <span className="font-medium">Radius (Skala M)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
        .custom-popup button:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
