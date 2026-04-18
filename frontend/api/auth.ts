import apiClient from './client';
import type { AuthResponse } from '@/types';

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post<any>('/auth/login', { email, password });
    // Backend may return `accessToken` (camelCase) or `access_token` (snake_case)
    const token = response.data.access_token || response.data.accessToken;
    const user = response.data.user;
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Also set cookie so Next.js middleware can read it (middleware can't read localStorage)
      document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
    return { access_token: token, user };
  },

  register: async (data: { email: string; password: string; name: string }) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear auth cookie too
    document.cookie = 'auth_token=; path=/; max-age=0';
  },

  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  },

  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  },
};
