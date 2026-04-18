import apiClient from './client';
import type { HazardZone } from '@/types';

export const hazardZoneApi = {
  getAll: async () => {
    const response = await apiClient.get<HazardZone[]>('/hazard-zones');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<HazardZone>('/hazard-zones/' + id);
    return response.data;
  },

  create: async (data: Partial<HazardZone>) => {
    const response = await apiClient.post<HazardZone>('/hazard-zones', data);
    return response.data;
  },

  update: async (id: number, data: Partial<HazardZone>) => {
    const response = await apiClient.put<HazardZone>('/hazard-zones/' + id, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete('/hazard-zones/' + id);
    return response.data;
  },
};
