import apiClient from "./client";

export interface Officer {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  managedEvacuationLocations?: Array<{
    id: number;
    name: string;
    address: string | null;
    condition: string;
    capacity: number;
    currentOccupancy: number;
  }>;
}

export interface OfficerStats {
  totalEvacuationLocations: number;
  totalCapacity: number;
  totalOccupancy: number;
  occupancyRate: number;
}

export interface DashboardResponse {
  officer: {
    id: number;
    name: string;
    email: string;
  };
  evacuationLocations: Array<{
    id: number;
    name: string;
    address: string | null;
    capacity: number;
    currentOccupancy: number;
    condition: string;
    status: string;
    geometry: any;
  }>;
  statistics: OfficerStats;
}

export const officerApi = {
  // Admin endpoints
  create: async (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => {
    const response = await apiClient.post<Officer>("/officers", data);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get<Officer[]>("/officers");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<Officer>(`/officers/${id}`);
    return response.data;
  },

  getStatistics: async (id: number) => {
    const response = await apiClient.get<OfficerStats>(
      `/officers/${id}/statistics`,
    );
    return response.data;
  },

  update: async (
    id: number,
    data: { name?: string; password?: string; phone?: string },
  ) => {
    const response = await apiClient.patch<Officer>(`/officers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete(`/officers/${id}`);
    return response.data;
  },

  // Officer dashboard endpoints
  getDashboard: async () => {
    const response =
      await apiClient.get<DashboardResponse>("/officer/dashboard");
    return response.data;
  },

  getMyEvacuationLocations: async () => {
    const response = await apiClient.get("/officer/evacuation-locations");
    return response.data;
  },

  updateOccupancy: async (evacuationLocationId: number, occupancy: number) => {
    const response = await apiClient.patch(
      `/officer/evacuation-locations/${evacuationLocationId}/occupancy`,
      {
        occupancy,
      },
    );
    return response.data;
  },

  updateCondition: async (evacuationLocationId: number, condition: string) => {
    const response = await apiClient.patch(
      `/officer/evacuation-locations/${evacuationLocationId}/condition`,
      {
        condition,
      },
    );
    return response.data;
  },

  updateStatus: async (evacuationLocationId: number, status: string) => {
    const response = await apiClient.patch(
      `/officer/evacuation-locations/${evacuationLocationId}/status`,
      {
        status,
      },
    );
    return response.data;
  },
};
