import { memo } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Marker, Popup } from "react-leaflet";
import type { Shelter } from "@/types";
import type { EvacuationMarkerData } from "./evacuation-marker";
import { createEvacuationMarker } from "./evacuation-marker";
import {
  createEvacuationClusterIcon,
  createEvacuationIcon,
  getShelterCategoryLabel,
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
        >
          <Popup>
            <div className="w-60">
              <div className="mb-2 text-xs font-bold text-blue-700">
                {getShelterCategoryLabel(shelter.category)}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {shelter.name}
              </h3>
              <dl className="mt-2 grid gap-1 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Kategori</dt>
                  <dd className="font-semibold">
                    {getShelterCategoryLabel(shelter.category)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Alamat</dt>
                  <dd className="text-right font-semibold">
                    {shelter.address || "Bantul, DIY"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Kapasitas</dt>
                  <dd className="font-semibold">
                    {Number(shelter.capacity || 0).toLocaleString("id-ID")}
                  </dd>
                </div>
              </dl>
            </div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
});

export { DETAIL_MARKER_ZOOM };
