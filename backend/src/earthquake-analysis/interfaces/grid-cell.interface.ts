export interface GridCell {
  grid_id: string;
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
  geometry: string; // WKT format
}

export interface FrequencyLevel {
  level: 'low' | 'medium' | 'high';
  color: string;
  minCount: number;
  maxCount: number;
}

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface AnalysisConfig {
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
}
