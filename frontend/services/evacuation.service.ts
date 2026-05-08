import { Shelter } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface NearbyShelter extends Shelter {
  distanceKm: number;
  availableCapacity: number;
}

export interface NearbySheltorsParams {
  lat: number;
  lng: number;
  radius?: number; // in kilometers, default 3km
  limit?: number; // max results, default 10
}

export const evacuationService = {
  /**
   * Get nearby shelters using PostGIS spatial query
   * Only returns shelters within specified radius
   */
  async getNearbyShelters(
    params: NearbySheltorsParams,
  ): Promise<NearbyShelter[]> {
    const { lat, lng, radius = 3, limit = 10 } = params;

    const queryParams = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      radius: radius.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/shelters/nearby?${queryParams}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch nearby shelters");
    }

    return response.json();
  },

  /**
   * Calculate route from user location to shelter
   */
  async calculateRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ) {
    const response = await fetch(`${API_BASE_URL}/roads/calculate-route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startLat,
        startLon: startLng,
        endLat,
        endLon: endLng,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to calculate route");
    }

    return response.json();
  },
};
