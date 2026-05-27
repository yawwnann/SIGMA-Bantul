"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Users,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NearbyEvacuationLocation } from "@/services/evacuation.service";
import { getCapacityColor, getCapacityLabel } from "./marker-icons";

interface NearbyEvacuationMarkersProps {
  evacuationLocations: NearbyEvacuationLocation[];
  onEvacuationLocationClick?: (evacuationLocation: NearbyEvacuationLocation) => void;
  onRouteClick?: (evacuationLocation: NearbyEvacuationLocation) => void;
}

// Category emoji mapping
const CATEGORY_ICONS: Record<string, string> = {
  SCHOOL: "🏫",
  FIELD: "🏟️",
  GOVERNMENT: "🏛️",
};

const getEvacuationLocationIcon = (category: string, capacity: number, currentOccupancy?: number) => {
  const color = getCapacityColor(capacity, currentOccupancy, "#64748b");
  const icon = CATEGORY_ICONS[category] || "🏛️";

  return L.divIcon({
    className: "custom-evacuationLocation-marker",
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background: white;
          border: 3px solid ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${icon}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const getCapacityBadgeClass = (capacity: number, currentOccupancy?: number) => {
  const pct = capacity > 0 && currentOccupancy !== undefined && currentOccupancy !== null
    ? (currentOccupancy / capacity) * 100
    : null;
  if (pct === null) return "bg-gray-100 text-gray-700 border-gray-300";
  if (pct >= 90) return "bg-red-100 text-red-700 border-red-300";
  if (pct >= 70) return "bg-orange-100 text-orange-700 border-orange-300";
  if (pct >= 50) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-green-100 text-green-700 border-green-300";
};

export function NearbyEvacuationMarkers({
  evacuationLocations,
  onEvacuationLocationClick,
  onRouteClick,
}: NearbyEvacuationMarkersProps) {
  return (
    <>
      {evacuationLocations.map((evacuationLocation) => {
        const coords = evacuationLocation.geometry as { coordinates: [number, number] };
        const position: [number, number] = [
          coords.coordinates[1],
          coords.coordinates[0],
        ];

        return (
          <Marker
            key={evacuationLocation.id}
            position={position}
            icon={getEvacuationLocationIcon(evacuationLocation.category, evacuationLocation.capacity, evacuationLocation.currentOccupancy)}
            eventHandlers={{
              click: () => {
                if (onEvacuationLocationClick) {
                  onEvacuationLocationClick(evacuationLocation);
                }
              },
            }}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-base text-slate-900">
                    {evacuationLocation.name}
                  </h3>
                  <Badge
                    className={`${getCapacityBadgeClass(evacuationLocation.capacity, evacuationLocation.currentOccupancy)} text-xs px-2 py-0.5`}
                  >
                    {getCapacityLabel(evacuationLocation.capacity, evacuationLocation.currentOccupancy)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-blue-600">
                      {evacuationLocation.distanceKm} km dari Anda
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>
                      Kapasitas: <strong>{evacuationLocation.availableCapacity}</strong> /{" "}
                      {evacuationLocation.capacity}
                    </span>
                  </div>

                  {evacuationLocation.address && (
                    <p className="text-xs text-slate-500 mt-2">
                      {evacuationLocation.address}
                    </p>
                  )}

                  {evacuationLocation.facilities && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-600">
                        <strong>Fasilitas:</strong> {evacuationLocation.facilities}
                      </p>
                    </div>
                  )}
                </div>

                {onRouteClick && (
                  <Button
                    onClick={() => onRouteClick(evacuationLocation)}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Lihat Rute Evakuasi
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
