import apiClient from './client';
import type { EvacuationRoute, RouteType } from '@/types';

export const evacuationApi = {
  calculateRoute: async (data: {
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
    type?: RouteType;
    maxResults?: number;
  }) => {
    const response = await apiClient.post<EvacuationRoute[]>('/routes/recommendation', data);
    return response.data;
  },

  getRecommendedRoutes: async (params?: { type?: RouteType; limit?: number }) => {
    const response = await apiClient.get<EvacuationRoute[]>('/routes/recommended', { params });
    return response.data;
  },

  getNearestShelter: async (lat: number, lon: number, limit?: number) => {
    const response = await apiClient.get('/routes/nearest-shelter', {
      params: { lat, lon, limit },
    });
    return response.data;
  },

  getWeights: async () => {
    const response = await apiClient.get('/routes/weights');
    return response.data;
  },

  updateWeights: async (weights: {
    hazard?: number;
    roadCondition?: number;
    distance?: number;
  }) => {
    const response = await apiClient.post('/routes/weights', weights);
    return response.data;
  },

  getStatistics: async () => {
    const response = await apiClient.get('/routes/statistics');
    return response.data;
  },
};
