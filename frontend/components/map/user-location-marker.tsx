"use client";

import { memo } from "react";
import L from "leaflet";
import { Marker } from "react-leaflet";
import type { UserLocation } from "@/hooks/use-user-location";

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: '<div class="user-location-marker__dot"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const UserLocationMarker = memo(function UserLocationMarker({
  location,
}: {
  location: UserLocation;
}) {
  return <Marker position={[location.lat, location.lng]} icon={userLocationIcon} />;
});
