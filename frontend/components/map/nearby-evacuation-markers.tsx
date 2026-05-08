"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  School,
  TreePine,
  Building2,
  MapPin,
  Users,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NearbyShelter } from "@/services/evacuation.service";

interface NearbyEvacuationMarkersProps {
  shelters: NearbyShelter[];
  onShelterClick?: (shelter: NearbyShelter) => void;
  onRouteClick?: (shelter: NearbyShelter) => void;
}

// Icon configurations per category
const getShelterIcon = (category: string) => {
  const iconConfigs = {
    SCHOOL: {
      color: "#3b82f6", // blue
      bgColor: "rgba(59, 130, 246, 0.2)",
      borderColor: "#3b82f6",
      icon: "🏫",
    },
    FIELD: {
      color: "#10b981", // green
      bgColor: "rgba(16, 185, 129, 0.2)",
      borderColor: "#10b981",
      icon: "🏟️",
    },
    GOVERNMENT: {
      color: "#ef4444", // red
      bgColor: "rgba(239, 68, 68, 0.2)",
      borderColor: "#ef4444",
      icon: "🏛️",
    },
  };

  const config =
    iconConfigs[category as keyof typeof iconConfigs] || iconConfigs.GOVERNMENT;

  return L.divIcon({
    className: "custom-shelter-marker",
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
          border: 3px solid ${config.borderColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${config.icon}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const getCategoryLabel = (category: string) => {
  const labels = {
    SCHOOL: "Sekolah",
    FIELD: "Lapangan",
    GOVERNMENT: "Pemerintahan",
  };
  return labels[category as keyof typeof labels] || category;
};

const getCategoryColor = (category: string) => {
  const colors = {
    SCHOOL: "bg-blue-100 text-blue-700 border-blue-300",
    FIELD: "bg-green-100 text-green-700 border-green-300",
    GOVERNMENT: "bg-red-100 text-red-700 border-red-300",
  };
  return (
    colors[category as keyof typeof colors] ||
    "bg-gray-100 text-gray-700 border-gray-300"
  );
};

export function NearbyEvacuationMarkers({
  shelters,
  onShelterClick,
  onRouteClick,
}: NearbyEvacuationMarkersProps) {
  return (
    <>
      {shelters.map((shelter) => {
        const coords = shelter.geometry as { coordinates: [number, number] };
        const position: [number, number] = [
          coords.coordinates[1],
          coords.coordinates[0],
        ];

        return (
          <Marker
            key={shelter.id}
            position={position}
            icon={getShelterIcon(shelter.category)}
            eventHandlers={{
              click: () => {
                if (onShelterClick) {
                  onShelterClick(shelter);
                }
              },
            }}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-base text-slate-900">
                    {shelter.name}
                  </h3>
                  <Badge
                    className={`${getCategoryColor(shelter.category)} text-xs px-2 py-0.5`}
                  >
                    {getCategoryLabel(shelter.category)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-blue-600">
                      {shelter.distanceKm} km dari Anda
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>
                      Kapasitas: <strong>{shelter.availableCapacity}</strong> /{" "}
                      {shelter.capacity}
                    </span>
                  </div>

                  {shelter.address && (
                    <p className="text-xs text-slate-500 mt-2">
                      {shelter.address}
                    </p>
                  )}

                  {shelter.facilities && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-600">
                        <strong>Fasilitas:</strong> {shelter.facilities}
                      </p>
                    </div>
                  )}
                </div>

                {onRouteClick && (
                  <Button
                    onClick={() => onRouteClick(shelter)}
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
