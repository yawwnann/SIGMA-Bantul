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
  const marker = L.marker(item.position, {
    icon: createEvacuationIcon(item.evacuationLocation.category),
    keyboard: false,
    riseOnHover: true,
  });

  marker.on("click", () => onClick(item.evacuationLocation));

  return marker;
}
