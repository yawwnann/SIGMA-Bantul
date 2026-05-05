import apiClient from "./client";
import type {
  Evacuee,
  EvacueeStats,
  EvacueeStatus,
  EvacueeGender,
} from "@/types";

export interface CreateEvacueeDto {
  shelterId: number;
  name: string;
  nik?: string;
  gender: EvacueeGender;
  age: number;
  address?: string;
  phone?: string;
  familySize: number;
  specialNeeds?: string;
  medicalCondition?: string;
  notes?: string;
}

export interface UpdateEvacueeDto {
  name?: string;
  nik?: string;
  gender?: EvacueeGender;
  age?: number;
  address?: string;
  phone?: string;
  familySize?: number;
  specialNeeds?: string;
  medicalCondition?: string;
  status?: EvacueeStatus;
  checkOutDate?: string;
  notes?: string;
}

export const evacueeApi = {
  async getAll(shelterId?: number, status?: EvacueeStatus): Promise<Evacuee[]> {
    const params = new URLSearchParams();
    if (shelterId) params.append("shelterId", shelterId.toString());
    if (status) params.append("status", status);

    const response = await apiClient.get<Evacuee[]>(
      `/evacuees?${params.toString()}`,
    );
    return response.data;
  },

  async getById(id: number): Promise<Evacuee> {
    const response = await apiClient.get<Evacuee>(`/evacuees/${id}`);
    return response.data;
  },

  async getStats(shelterId: number): Promise<EvacueeStats> {
    const response = await apiClient.get<EvacueeStats>(
      `/evacuees/stats/${shelterId}`,
    );
    return response.data;
  },

  async create(data: CreateEvacueeDto): Promise<Evacuee> {
    const response = await apiClient.post<Evacuee>("/evacuees", data);
    return response.data;
  },

  async update(id: number, data: UpdateEvacueeDto): Promise<Evacuee> {
    const response = await apiClient.put<Evacuee>(`/evacuees/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/evacuees/${id}`);
  },
};
