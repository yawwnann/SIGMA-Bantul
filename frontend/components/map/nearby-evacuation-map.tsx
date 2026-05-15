"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { X } from "lucide-react";
import type { Earthquake, HazardZone, PublicFacility, Shelter } from "@/types";
import type { UserLocation } from "@/hooks/use-user-location";
import { Button } from "@/components/ui/button";
import { NearbyEvacuationMarkers } from "./nearby-evacuation-markers";
import { UserLocationMarker } from "./user-location-marker";
import { getShelterCategoryLabel } from "./marker-icons";
import "leaflet/dist/leaflet.css";

const BANTUL_CENTER: [number, number] = [-7.888, 110.33];

type NearbyEvacuationMapProps = {
  shelters: Shelter[];
  hazardZones?: HazardZone[];
  earthquakes?: Earthquake[];
  facilities?: PublicFacility[];
  userLocation?: UserLocation | null;
  selectedLocation: UserLocation | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  onEarthquakeClick?: (earthquake: Earthquake) => void;
  onCalculateRoute?: (
    shelterLat: number,
    shelterLng: number,
    shelterName: string,
  ) => void;
  roadNetwork?: Record<string, unknown> | null;
  calculatedRoute?: Record<string, any> | null;
  routeStart?: UserLocation | null;
  routeEnd?: UserLocation | null;
  selectedEarthquake?: Earthquake | null;
};

import { NearbyShelter } from "@/services/evacuation.service";

function getShelterCoordinates(shelter: Shelter) {
  const geometry = shelter.geometry as
    | { coordinates?: [number, number] }
    | undefined;
  const coordinates = geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  return { lng: coordinates[0], lat: coordinates[1] };
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const RecenterMap = memo(function RecenterMap({
  location,
}: {
  location: UserLocation | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 14), {
      duration: 1,
    });
  }, [location, map]);

  return null;
});

export default function NearbyEvacuationMap({
  shelters,
  userLocation,
  selectedLocation,
  onCalculateRoute,
  calculatedRoute,
}: NearbyEvacuationMapProps) {
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const routeData = useMemo(() => calculatedRoute || null, [calculatedRoute]);
  const selectedShelterCoords = selectedShelter
    ? getShelterCoordinates(selectedShelter)
    : null;

  // Transform Shelter[] to NearbyShelter[] with distance and available capacity
  const nearbyShelters = useMemo<NearbyShelter[]>(() => {
    if (!selectedLocation) return [];

    return shelters.map((shelter) => {
      const coords = getShelterCoordinates(shelter);
      const distanceKm = coords
        ? calculateDistance(
            selectedLocation.lat,
            selectedLocation.lng,
            coords.lat,
            coords.lng,
          )
        : 0;

      return {
        ...shelter,
        distanceKm,
        availableCapacity: shelter.capacity, // Assuming full capacity available
      };
    });
  }, [shelters, selectedLocation]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={
          selectedLocation
            ? [selectedLocation.lat, selectedLocation.lng]
            : BANTUL_CENTER
        }
        zoom={selectedLocation ? 14 : 11}
        minZoom={10}
        maxZoom={19}
        preferCanvas={true}
        zoomControl={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <RecenterMap location={userLocation ?? selectedLocation} />
        {(userLocation ?? selectedLocation) && (
          <UserLocationMarker
            lat={(userLocation ?? selectedLocation)!.lat}
            lng={(userLocation ?? selectedLocation)!.lng}
            heading={userLocation?.heading}
          />
        )}
        <NearbyEvacuationMarkers
          shelters={nearbyShelters}
          onShelterClick={setSelectedShelter}
        />
        {routeData?.geometry && (
          <GeoJSON
            key={JSON.stringify(routeData.geometry)}
            data={routeData as any}
            style={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}
      </MapContainer>

      {selectedShelter && selectedShelterCoords && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] max-h-[52%] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 sm:left-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-[320px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                {getShelterCategoryLabel(selectedShelter.category)}
              </div>
              <h3 className="text-base font-bold leading-tight text-slate-900 dark:text-zinc-50">
                {selectedShelter.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {selectedShelter.address || "Bantul, DIY"}
              </p>
            </div>
            <button
              onClick={() => setSelectedShelter(null)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Tutup detail lokasi evakuasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-zinc-900">
              <div className="text-xs font-semibold text-slate-500">
                Kapasitas
              </div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-zinc-50">
                {Number(selectedShelter.capacity || 0).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Terisi
              </div>
              <div className="mt-1 text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {Number(selectedShelter.currentOccupancy || 0).toLocaleString(
                  "id-ID",
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              onCalculateRoute?.(
                selectedShelterCoords.lat,
                selectedShelterCoords.lng,
                selectedShelter.name,
              );
              setSelectedShelter(null);
            }}
            className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            Lihat Rute Evakuasi
          </Button>
        </div>
      )}

      <style jsx global>{`
        .user-location-marker {
          background: transparent;
          border: 0;
        }
        .user-location-marker__dot {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: #2563eb;
          border: 3px solid #ffffff;
          box-shadow:
            0 0 0 8px rgba(37, 99, 235, 0.18),
            0 8px 20px rgba(15, 23, 42, 0.25);
        }
        .evacuation-marker-icon {
          background: transparent;
          border: 0;
        }
        .evacuation-marker-pin {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--marker-color);
          border: 2px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
          transform: rotate(-45deg);
        }
        .evacuation-marker-pin svg {
          width: 16px;
          height: 16px;
          transform: rotate(45deg);
        }
        .evacuation-cluster-wrapper {
          background: transparent;
          border: 0;
        }
        .evacuation-cluster {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 13px;
          font-weight: 800;
          background: #0f766e;
          border: 3px solid #ffffff;
          border-radius: 999px;
          box-shadow:
            0 0 0 6px rgba(15, 118, 110, 0.18),
            0 10px 22px rgba(15, 23, 42, 0.2);
        }
        .evacuation-cluster-medium {
          background: #2563eb;
        }
        .evacuation-cluster-large {
          background: #dc2626;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
