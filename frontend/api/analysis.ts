import apiClient from "./client";

export interface FrequencyQuery {
  start_date: string;
  end_date: string;
  grid_size?: number;
  min_magnitude?: number;
  max_depth?: number;
}

export interface GridCell {
  grid_id: string;
  count: number;
  level: "low" | "medium" | "high";
  center: {
    lat: number;
    lon: number;
  };
  geometry: any;
}

export interface FrequencyAnalysisResponse {
  metadata: {
    start_date: string;
    end_date: string;
    grid_size: number;
    total_grids: number;
    total_earthquakes: number;
  };
  grids: GridCell[];
  statistics: {
    low_count: number;
    medium_count: number;
    high_count: number;
  };
}

export interface AnalysisStatistics {
  total_earthquakes: number;
  avg_magnitude: number;
  max_magnitude: number;
  most_active_area: any;
  distribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export const analysisApi = {
  getFrequencyAnalysis: async (query: FrequencyQuery) => {
    const response = await apiClient.get<{
      success: boolean;
      data: FrequencyAnalysisResponse;
    }>("/analysis/frequency", { params: query });
    return response.data.data;
  },

  getStatistics: async (startDate: string, endDate: string) => {
    const response = await apiClient.get<{
      success: boolean;
      data: AnalysisStatistics;
    }>("/analysis/statistics", {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data.data;
  },

  getBantulBoundary: async () => {
    const response = await apiClient.get<{
      success: boolean;
      data: any;
    }>("/analysis/bantul-boundary");
    return response.data.data;
  },

  getBpbdRisk: async () => {
    const response = await apiClient.get<{
      success: boolean;
      data: any;
    }>("/bpbd-risk");
    return response.data.data;
  },
};
