import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Only redirect if NOT on an admin protected page (leave admin pages to handle their own auth)
        const isAdminPage = window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login';
        if (!isAdminPage) {
          localStorage.removeItem('token');
          window.location.href = '/admin/login';
        } else {
          // On admin pages, just log - let the page handle it
          console.warn('[Auth] 401 on admin page, not auto-redirecting:', error.config?.url);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
