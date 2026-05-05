export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
  SHELTER_OFFICER = "SHELTER_OFFICER",
}

export enum HazardLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum RoadType {
  NATIONAL = "NATIONAL",
  PROVINCIAL = "PROVINCIAL",
  REGIONAL = "REGIONAL",
  LOCAL = "LOCAL",
}

export enum RoadCondition {
  GOOD = "GOOD",
  MODERATE = "MODERATE",
  POOR = "POOR",
  DAMAGED = "DAMAGED",
}

export enum RoadVulnerability {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum ShelterCondition {
  GOOD = "GOOD",
  MODERATE = "MODERATE",
  NEEDS_REPAIR = "NEEDS_REPAIR",
  DAMAGED = "DAMAGED",
}

export enum RouteType {
  PRIMARY = "PRIMARY",
  ALTERNATIVE = "ALTERNATIVE",
}

export enum EvacueeStatus {
  ACTIVE = "ACTIVE",
  RELOCATED = "RELOCATED",
  RETURNED_HOME = "RETURNED_HOME",
}

export enum EvacueeGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Earthquake {
  id: number;
  bmkgId?: string;
  magnitude: number;
  depth: number;
  lat: number;
  lon: number;
  location: string;
  region: string;
  time: string;
  timestamp: string;
  isLatest: boolean;
  dirasakan?: string;
  potential?: string;
  shakemapUrl?: string;
}

export interface HazardZone {
  id: number;
  name: string;
  level: HazardLevel;
  geometry: object;
  description?: string;
  area?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Shelter {
  id: number;
  name: string;
  capacity: number;
  currentOccupancy?: number;
  geometry: object;
  address?: string;
  condition: ShelterCondition;
  facilities?: string;
  officerId?: number;
  officer?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Road {
  id: number;
  name: string;
  geometry: object;
  type: RoadType;
  condition: RoadCondition;
  vulnerability: RoadVulnerability;
  length?: number;
  safe_cost?: number;
  source?: number;
  target?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvacuationRoute {
  id: number;
  name: string;
  geometry: object;
  type: RouteType;
  score: number;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFacility {
  id: number;
  name: string;
  type: string;
  geometry: object;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface DashboardStats {
  shelterCount: number;
  earthquakeCount: number;
  routeCount: number;
  latestEarthquake?: Earthquake;
}

export interface Officer {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  managedShelters?: Shelter[];
}

export interface OfficerStats {
  totalShelters: number;
  totalCapacity: number;
  totalOccupancy: number;
  occupancyRate: number;
}

export interface OfficerDashboardResponse {
  officer: {
    id: number;
    name: string;
    email: string;
  };
  shelters: Shelter[];
  statistics: OfficerStats;
}

export interface Evacuee {
  id: number;
  shelterId: number;
  shelter?: {
    id: number;
    name: string;
    address?: string;
  };
  name: string;
  nik?: string;
  gender: EvacueeGender;
  age: number;
  address?: string;
  phone?: string;
  familySize: number;
  specialNeeds?: string;
  medicalCondition?: string;
  status: EvacueeStatus;
  checkInDate: string;
  checkOutDate?: string;
  notes?: string;
  registeredBy?: number;
  registeredByUser?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EvacueeStats {
  total: number;
  active: number;
  relocated: number;
  returnedHome: number;
  byGender: Array<{
    gender: EvacueeGender;
    _count: number;
  }>;
  byAgeGroup: Array<{
    age_group: string;
    count: number;
  }>;
}
