"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerMapProps {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

const BANTUL_CENTER: [number, number] = [-7.888, 110.33];

export default function LocationPickerMap({
  lat,
  lon,
  onChange,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 13,
      zoomControl: true,
    });

    // Use a simple tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:22px;height:22px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.6);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const marker = L.marker([lat, lon], { icon, draggable: true }).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChange(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChange(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when lat/lon changes from outside (e.g. manual input)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (isNaN(lat) || isNaN(lon)) return;
    markerRef.current.setLatLng([lat, lon]);
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "220px",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    />
  );
}
