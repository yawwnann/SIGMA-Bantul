"use client";

import { memo, useMemo } from "react";
import type { Shelter } from "@/types";
import { EvacuationCluster } from "./evacuation-cluster";
import { toEvacuationMarkerData } from "./evacuation-marker";

export const NearbyEvacuationMarkers = memo(function NearbyEvacuationMarkers({
  shelters,
  onMarkerClick,
}: {
  shelters: Shelter[];
  onMarkerClick: (shelter: Shelter) => void;
}) {
  const markerData = useMemo(() => toEvacuationMarkerData(shelters), [shelters]);

  return <EvacuationCluster items={markerData} onMarkerClick={onMarkerClick} />;
});
