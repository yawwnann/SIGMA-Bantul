import apiClient from './client';
import type { Shelter, ShelterCondition } from '@/types';

export const shelterApi = {
  getAll: async (params?: { condition?: ShelterCondition }) => {
    const response = await apiClient.get<Shelter[]>('/shelters', { params });
    return response.data;
  },

  getNearby: async (lat: number, lon: number, radius?: number) => {
    const response = await apiClient.get<Shelter[]>('/shelters/nearby', {
      params: { lat, lon, radius },
    });
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/shelters/statistics');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<Shelter>('/shelters/' + id);
    return response.data;
  },

  create: async (data: Partial<Shelter>) => {
    const response = await apiClient.post<Shelter>('/shelters', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Shelter>) => {
    const response = await apiClient.put<Shelter>('/shelters/' + id, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete('/shelters/' + id);
    return response.data;
  },
};
