import apiClient from './client';
import type { PublicFacility } from '@/types';

export const publicFacilityApi = {
  getAll: async (type?: string) => {
    const response = await apiClient.get<PublicFacility[]>('/public-facilities', {
      params: type ? { type } : undefined,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<PublicFacility>('/public-facilities/' + id);
    return response.data;
  },

  create: async (data: Partial<PublicFacility>) => {
    const response = await apiClient.post<PublicFacility>('/public-facilities', data);
    return response.data;
  },

  update: async (id: number, data: Partial<PublicFacility>) => {
    const response = await apiClient.put<PublicFacility>('/public-facilities/' + id, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete('/public-facilities/' + id);
    return response.data;
  },
};
