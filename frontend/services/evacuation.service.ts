import apiClient from "@/api/client";
import type { Shelter } from "@/types";

export type NearbyEvacuationLocation = Shelter & {
  distanceMeters: number;
  distanceKm: number;
};

export type NearbyEvacuationResponse = {
  data: NearbyEvacuationLocation[];
  meta: {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
    count: number;
  };
};

export const evacuationLocationService = {
  getNearby: async (params: {
    lat: number;
    lng: number;
    radius?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<NearbyEvacuationResponse>(
      "/evacuation-locations/nearby",
      { params },
    );
    return response.data;
  },
};
