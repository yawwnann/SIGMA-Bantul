"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Navigation } from "lucide-react";

interface UserLocationMarkerProps {
  lat: number;
  lng: number;
  heading?: number;
}

function createIcon(heading?: number) {
  if (heading === undefined) {
    return L.divIcon({
      className: "custom-user-location-marker",
      html: `
        <div style="position:relative;width:40px;height:40px;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;background:rgba(59,130,246,0.2);border:2px solid rgba(59,130,246,0.4);border-radius:50%;animation:pulse 2s ease-in-out infinite;"></div>
        </div>
        <style>
          @keyframes pulse { 0%,100% { transform:translate(-50%,-50%) scale(1); opacity:1; } 50% { transform:translate(-50%,-50%) scale(1.3); opacity:0.5; } }
        </style>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  }

  return L.divIcon({
    className: "custom-user-location-marker",
    html: `
      <div style="position:relative;width:44px;height:54px;">
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%) rotate(${heading}deg);width:16px;height:16px;">
          <svg viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 20h16L12 2z"/></svg>
        </div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:24px;height:24px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:44px;height:44px;background:rgba(59,130,246,0.15);border:2px solid rgba(59,130,246,0.3);border-radius:50%;animation:pulse 2s ease-in-out infinite;margin:-10px;"></div>
      </div>
      <style>
        @keyframes pulse { 0%,100% { transform:translateX(-50%) scale(1); opacity:1; } 50% { transform:translateX(-50%) scale(1.3); opacity:0.5; } }
      </style>
    `,
    iconSize: [44, 54],
    iconAnchor: [22, 37],
    popupAnchor: [0, -40],
  });
}

export function UserLocationMarker({ lat, lng, heading }: UserLocationMarkerProps) {
  return (
    <Marker position={[lat, lng]} icon={createIcon(heading)}>
      <Popup>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <strong className="text-sm">Lokasi Anda</strong>
          </div>
          <p className="text-xs text-slate-600">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
          {heading !== undefined && (
            <p className="text-xs text-blue-600 mt-1">
              Arah: {heading.toFixed(0)}°
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
