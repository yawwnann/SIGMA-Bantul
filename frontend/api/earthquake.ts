import apiClient from './client';
import type { Earthquake, PaginatedResponse } from '@/types';

export const earthquakeApi = {
  getLatest: async () => {
    const response = await apiClient.get<Earthquake>('/earthquakes/latest');
    return response.data;
  },

  getLatestBMKG: async () => {
    const response = await apiClient.get<Earthquake>('/earthquakes/latest-bmkg');
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    region?: string;
  }) => {
    const response = await apiClient.get<PaginatedResponse<Earthquake>>('/earthquakes', { params });
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/earthquakes/statistics');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<Earthquake>('/earthquakes/' + id);
    return response.data;
  },

  syncFromBMKG: async () => {
    const response = await apiClient.post('/earthquakes/sync');
    return response.data;
  },

  create: async (data: Partial<Earthquake>) => {
    const response = await apiClient.post<Earthquake>('/earthquakes', data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete('/earthquakes/' + id);
    return response.data;
  },
};
