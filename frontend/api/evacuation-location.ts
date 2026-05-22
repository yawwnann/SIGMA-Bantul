import apiClient from "./client";
import type { EvacuationLocation, EvacuationLocationCategory, EvacuationLocationCondition } from "@/types";

export const evacuationLocationApi = {
  getAll: async (params?: {
    condition?: EvacuationLocationCondition;
    category?: EvacuationLocationCategory;
  }) => {
    const response = await apiClient.get<EvacuationLocation[]>("/evacuation-locations", { params });
    return response.data;
  },

  getNearby: async (lat: number, lon: number, radius?: number) => {
    const response = await apiClient.get<EvacuationLocation[]>("/evacuation-locations/nearby", {
      params: { lat, lon, radius },
    });
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get("/evacuation-locations/statistics");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<EvacuationLocation>("/evacuation-locations/" + id);
    return response.data;
  },

  create: async (data: Partial<EvacuationLocation>) => {
    const response = await apiClient.post<EvacuationLocation>("/evacuation-locations", data);
    return response.data;
  },

  update: async (id: number, data: Partial<EvacuationLocation>) => {
    const response = await apiClient.put<EvacuationLocation>("/evacuation-locations/" + id, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete("/evacuation-locations/" + id);
    return response.data;
  },

  assignOfficer: async (evacuationLocationId: number, officerId: number) => {
    const response = await apiClient.put(`/evacuation-locations/${evacuationLocationId}/assign`, {
      officerId,
    });
    return response.data;
  },

  unassignOfficer: async (evacuationLocationId: number) => {
    const response = await apiClient.delete(`/evacuation-locations/${evacuationLocationId}/assign`);
    return response.data;
  },
};
