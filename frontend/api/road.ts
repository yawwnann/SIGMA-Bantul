import apiClient from "./client";

export interface RoadNetworkBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface RouteSegment {
  id: number;
  name: string;
  type: string;
  condition: string;
  distance: number;
  time: number;
}

export interface RouteResponse {
  type: "Feature";
  properties: {
    totalDistance: number;
    totalTime: number;
    segments: number;
  };
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
  segments: RouteSegment[];
}

export const roadApi = {
  /**
   * Get road network as GeoJSON for map overlay
   */
  getRoadNetwork: async (bounds?: RoadNetworkBounds) => {
    const params = bounds
      ? new URLSearchParams({
          minLat: bounds.minLat.toString(),
          maxLat: bounds.maxLat.toString(),
          minLon: bounds.minLon.toString(),
          maxLon: bounds.maxLon.toString(),
        })
      : "";

    const response = await apiClient.get(
      `/roads/network${params ? `?${params}` : ""}`,
    );
    return response.data;
  },

/**
    * Calculate shortest route between two points using Dijkstra
    */
  calculateRoute: async (
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
  ): Promise<RouteResponse> => {
    const response = await apiClient.get("/roads/route", {
      params: { startLat, startLon, endLat, endLon },
    });
    return response.data;
  },

  /**
   * Get all roads (Paginated)
   */
  getAll: async (params?: { page?: number; limit?: number; type?: string; condition?: string }) => {
    const response = await apiClient.get("/roads", { params });
    return response.data;
  },

  /**
   * Create new road
   */
  create: async (data: any) => {
    const response = await apiClient.post("/roads", data);
    return response.data;
  },

  /**
   * Update road
   */
  update: async (id: number, data: any) => {
    const response = await apiClient.put(`/roads/${id}`, data);
    return response.data;
  },

  /**
   * Delete road
   */
  delete: async (id: number) => {
    const response = await apiClient.delete(`/roads/${id}`);
    return response.data;
  },
};
