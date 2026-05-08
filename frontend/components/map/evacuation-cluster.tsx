import { memo } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Marker } from "react-leaflet";
import type { Shelter } from "@/types";
import type { EvacuationMarkerData } from "./evacuation-marker";
import { createEvacuationMarker } from "./evacuation-marker";
import {
  createEvacuationClusterIcon,
  createEvacuationIcon,
} from "./marker-icons";

const DETAIL_MARKER_ZOOM = 13;

export function createEvacuationClusterLayer(
  items: EvacuationMarkerData[],
  onMarkerClick: (shelter: Shelter) => void,
) {
  const clusterLayer = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 80,
    chunkDelay: 30,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: DETAIL_MARKER_ZOOM,
    maxClusterRadius: (zoom) => (zoom < 11 ? 80 : zoom < 13 ? 56 : 32),
    iconCreateFunction: createEvacuationClusterIcon,
  });

  const markers = items.map((item) => createEvacuationMarker(item, onMarkerClick));
  clusterLayer.addLayers(markers);

  return clusterLayer;
}

type EvacuationClusterProps = {
  items: EvacuationMarkerData[];
  onMarkerClick: (shelter: Shelter) => void;
};

export const EvacuationCluster = memo(function EvacuationCluster({
  items,
  onMarkerClick,
}: EvacuationClusterProps) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      chunkInterval={80}
      chunkDelay={30}
      showCoverageOnHover={false}
      spiderfyOnMaxZoom
      disableClusteringAtZoom={DETAIL_MARKER_ZOOM}
      maxClusterRadius={(zoom) => (zoom < 11 ? 80 : zoom < 13 ? 56 : 32)}
      iconCreateFunction={createEvacuationClusterIcon}
    >
      {items.map(({ shelter, position }) => (
        <Marker
          key={shelter.id}
          position={position}
          icon={createEvacuationIcon(shelter.category)}
          eventHandlers={{ click: () => onMarkerClick(shelter) }}
        />
      ))}
    </MarkerClusterGroup>
  );
});

export { DETAIL_MARKER_ZOOM };
