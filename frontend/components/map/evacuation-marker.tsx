import L from "leaflet";
import type { Shelter } from "@/types";
import { createEvacuationIcon } from "./marker-icons";

export type EvacuationMarkerData = {
  shelter: Shelter;
  position: L.LatLngTuple;
};

export function getShelterPosition(shelter: Shelter): L.LatLngTuple | null {
  const geometry = shelter.geometry as
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
  shelters: Shelter[],
): EvacuationMarkerData[] {
  return shelters.reduce<EvacuationMarkerData[]>((items, shelter) => {
    const position = getShelterPosition(shelter);
    if (!position) return items;

    items.push({ shelter, position });
    return items;
  }, []);
}

export function createEvacuationMarker(
  item: EvacuationMarkerData,
  onClick: (shelter: Shelter) => void,
) {
  const marker = L.marker(item.position, {
    icon: createEvacuationIcon(item.shelter.category),
    keyboard: false,
    riseOnHover: true,
  });

  marker.on("click", () => onClick(item.shelter));

  return marker;
}
