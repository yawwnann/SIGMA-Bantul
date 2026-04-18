import apiClient from './client';
import type { DashboardStats } from '@/types';

export const dashboardApi = {
  getSummary: async () => {
    const response = await apiClient.get<DashboardStats>('/dashboard/summary');
    return response.data;
  },
};
