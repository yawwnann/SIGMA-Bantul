import L from "leaflet";
import type { EvacuationLocation } from "@/types";
import { createEvacuationIcon } from "./marker-icons";

export type EvacuationMarkerData = {
  evacuationLocation: EvacuationLocation;
  position: L.LatLngTuple;
};

export function getEvacuationLocationPosition(evacuationLocation: EvacuationLocation): L.LatLngTuple | null {
  const geometry = evacuationLocation.geometry as
    | { type?: string; coordinates?: [number, number] }
    | undefined;

  if (
    !geometry?.coordinates ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
    return null;
  }

  const [lng, lat] = geometry.coordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return [lat, lng];
}

export function toEvacuationMarkerData(
  evacuationLocations: EvacuationLocation[],
): EvacuationMarkerData[] {
  return evacuationLocations.reduce<EvacuationMarkerData[]>((items, evacuationLocation) => {
    const position = getEvacuationLocationPosition(evacuationLocation);
    if (!position) return items;

    items.push({ evacuationLocation, position });
    return items;
  }, []);
}

export function createEvacuationMarker(
  item: EvacuationMarkerData,
  onClick: (evacuationLocation: EvacuationLocation) => void,
) {
  const { category, capacity, currentOccupancy } = item.evacuationLocation;
  const marker = L.marker(item.position, {
    icon: createEvacuationIcon(category, capacity, currentOccupancy),
    keyboard: false,
    riseOnHover: true,
  });

  marker.on("click", () => onClick(item.evacuationLocation));

  return marker;
}

// Update marker icon based on new occupancy data
export function updateMarkerIcon(
  marker: L.Marker,
  currentOccupancy: number,
  totalCapacity: number,
  category?: string,
) {
  marker.setIcon(createEvacuationIcon(category, totalCapacity, currentOccupancy));
}

// Evacuation markers manager for real-time updates
export class EvacuationMarkersManager {
  private markers: Map<number, L.Marker> = new Map();

  addMarker(id: number, marker: L.Marker) {
    this.markers.set(id, marker);
  }

  removeMarker(id: number) {
    const marker = this.markers.get(id);
    if (marker) {
      marker.remove();
      this.markers.delete(id);
    }
  }

  updateMarkerOccupancy(id: number, currentOccupancy: number, totalCapacity: number, category?: string) {
    const marker = this.markers.get(id);
    if (marker) {
      updateMarkerIcon(marker, currentOccupancy, totalCapacity, category);
    }
  }

  getMarker(id: number): L.Marker | undefined {
    return this.markers.get(id);
  }

  clear() {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
  }

  get size(): number {
    return this.markers.size;
  }
}
