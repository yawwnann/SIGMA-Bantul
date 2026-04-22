import apiClient from "./client";

export interface BpbdRiskZone {
  id: number;
  name: string;
  kecamatan: string;
  desa: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  bahaya?: string;
  iaGempa?: number;
  taGempa?: number;
  tRisk?: number;
  skorTRisk?: number;
  area?: number;
  description?: string;
  geometry: any;
  createdAt: string;
  updatedAt: string;
}

export interface BpbdStatistics {
  totalZones: number;
  byRiskLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  totalRoads: number;
  roadsWithBpbdRisk: number;
  roadsByRiskLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
}

export interface ImportResult {
  imported: number;
  errors: number;
  total: number;
  skipped?: number;
}

export interface AssignmentResult {
  totalRoads: number;
  assigned: number;
  defaulted: number;
  byRiskLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
}

/**
 * Get all BPBD risk zones
 */
export async function getBpbdZones(): Promise<BpbdRiskZone[]> {
  const response = await apiClient.get("/bpbd-risk/zones");
  return response.data.data;
}

/**
 * Get BPBD risk zone by ID
 */
export async function getBpbdZoneById(id: number): Promise<BpbdRiskZone> {
  const response = await apiClient.get(`/bpbd-risk/zones/${id}`);
  return response.data.data;
}

/**
 * Import BPBD zones from GeoJSON (Admin only)
 */
export async function importBpbdZones(): Promise<ImportResult> {
  const response = await apiClient.post("/bpbd-risk/import");
  return response.data.data;
}

/**
 * Assign BPBD risk to roads via spatial join (Admin only)
 */
export async function assignRiskToRoads(): Promise<AssignmentResult> {
  const response = await apiClient.post("/bpbd-risk/assign-to-roads");
  return response.data.data;
}

/**
 * Get BPBD risk statistics
 */
export async function getBpbdStatistics(): Promise<BpbdStatistics> {
  const response = await apiClient.get("/bpbd-risk/statistics");
  return response.data.data;
}

/**
 * Get validation report comparing BPBD vs frequency analysis
 */
export async function getValidation(): Promise<any> {
  const response = await apiClient.get("/bpbd-risk/validation");
  return response.data.data;
}
