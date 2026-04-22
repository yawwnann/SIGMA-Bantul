"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface BpbdRiskZone {
  id: number;
  name: string;
  kecamatan: string;
  desa: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  bahaya?: string;
  area?: number;
  geometry: {
    type: string;
    coordinates: number[][][][];
  };
}

interface BpbdRiskLayerProps {
  map: L.Map | null;
  visible: boolean;
  onFeatureClick?: (feature: BpbdRiskZone) => void;
}

export function BpbdRiskLayer({
  map,
  visible,
  onFeatureClick,
}: BpbdRiskLayerProps) {
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const zonesRef = useRef<BpbdRiskZone[]>([]);

  useEffect(() => {
    if (!map) return;

    // Create layer group if it doesn't exist
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup();
    }

    // Add or remove from map based on visibility
    if (visible) {
      if (!map.hasLayer(layerGroupRef.current)) {
        layerGroupRef.current.addTo(map);
      }
      // Fetch zones if not already loaded
      if (zonesRef.current.length === 0) {
        fetchBpbdZones();
      }
    } else {
      if (map.hasLayer(layerGroupRef.current)) {
        map.removeLayer(layerGroupRef.current);
      }
    }

    return () => {
      if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, visible]);

  const fetchBpbdZones = async () => {
    try {
      const response = await fetch("http://localhost:3001/bpbd-risk/zones");
      if (!response.ok) {
        throw new Error("Failed to fetch BPBD zones");
      }

      const result = await response.json();
      const zones = result.data || [];
      zonesRef.current = zones;

      // Render zones
      renderZones(zones);
    } catch (err) {
      console.error("Error fetching BPBD zones:", err);
    }
  };

  const getRiskColor = (level: string): string => {
    const colors = {
      LOW: "#10b981", // green-500
      MEDIUM: "#f59e0b", // amber-500
      HIGH: "#ef4444", // red-500
    };
    return colors[level as keyof typeof colors] || "#6b7280";
  };

  const renderZones = (zones: BpbdRiskZone[]) => {
    if (!layerGroupRef.current) return;

    // Clear existing layers
    layerGroupRef.current.clearLayers();

    zones.forEach((zone) => {
      const color = getRiskColor(zone.riskLevel);

      // Convert GeoJSON to Leaflet format
      const geoJsonLayer = L.geoJSON(
        {
          type: "Feature",
          properties: zone,
          geometry: zone.geometry,
        } as any,
        {
          style: {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2,
            opacity: 0.8,
          },
          onEachFeature: (_feature, layer) => {
            // Add hover effects
            layer.on({
              mouseover: (e) => {
                const target = e.target;
                target.setStyle({
                  fillOpacity: 0.5,
                  weight: 3,
                });
              },
              mouseout: (e) => {
                const target = e.target;
                target.setStyle({
                  fillOpacity: 0.3,
                  weight: 2,
                });
              },
              click: () => {
                if (onFeatureClick) {
                  onFeatureClick(zone);
                }
              },
            });

            // Add popup
            const popupContent = `
              <div class="p-2 min-w-[200px]">
                <h3 class="font-bold text-lg mb-2">${zone.name}</h3>
                <div class="space-y-1 text-sm">
                  <p>
                    <span class="font-semibold">Kecamatan:</span> ${zone.kecamatan}
                  </p>
                  <p>
                    <span class="font-semibold">Desa:</span> ${zone.desa}
                  </p>
                  <p>
                    <span class="font-semibold">Risk Level:</span> 
                    <span class="px-2 py-1 rounded text-white font-medium" style="background-color: ${color}">
                      ${zone.riskLevel}
                    </span>
                  </p>
                  ${zone.bahaya ? `<p><span class="font-semibold">Bahaya:</span> ${zone.bahaya}</p>` : ""}
                  ${zone.area ? `<p><span class="font-semibold">Area:</span> ${zone.area.toFixed(2)} km²</p>` : ""}
                </div>
              </div>
            `;
            layer.bindPopup(popupContent);
          },
        },
      );

      // Add to layer group
      if (layerGroupRef.current) {
        geoJsonLayer.addTo(layerGroupRef.current);
      }
    });
  };

  return null; // This component doesn't render anything in React
}
