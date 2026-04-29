import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RouteType, RoadCondition, RoadVulnerability } from '@prisma/client';

export interface RouteScore {
  roadId: number;
  roadName: string;
  geometry: unknown;
  score: number;
  breakdown: {
    hazardScore: number;
    conditionScore: number;
    distanceScore: number;
  };
}

interface ShelterWithDistance {
  id: number;
  name: string;
  geometry: unknown;
  distance: number;
}

interface RoadGeometry {
  type: string;
  coordinates: number[][][] | number[][] | number[];
}

interface HazardZoneGeometry {
  type: string;
  coordinates: number[][][][] | number[][][];
}

@Injectable()
export class EvacuationService {
  private readonly logger = new Logger(EvacuationService.name);

  private readonly WEIGHTS = {
    hazard: 0.5,
    roadCondition: 0.3,
    distance: 0.2,
  };

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async calculateWeightedOverlay(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    type: RouteType = RouteType.PRIMARY,
    maxResults: number = 5,
    useBpbdRisk: boolean = true, // Enable BPBD risk by default
  ) {
    const cacheKey = `evacuation:route:${startLat}:${startLon}:${endLat}:${endLon}:${type}:${useBpbdRisk}`;
    const cached = await this.redis.getJson<RouteScore[]>(cacheKey);
    if (cached) return cached;

    const roads = await this.prisma.road.findMany();
    // Load all shelters and filter out full ones
    const allShelters = await this.prisma.shelter.findMany();
    const shelters = allShelters.filter((s) => s.currentOccupancy < s.capacity);

    if (shelters.length === 0) {
      this.logger.warn('No available shelters found!');
      // fallback just in case to show paths
    }

    const hazardZones = await this.prisma.hazardZone.findMany();

    const scoredRoutes: RouteScore[] = [];

    for (const road of roads) {
      const geometry = road.geometry as unknown as RoadGeometry | null;
      const roadCoords = this.extractCoordinates(geometry);

      const hazardZonesTyped = hazardZones.map((z) => ({
        geometry: z.geometry as unknown as HazardZoneGeometry | null,
      }));
      const isNearHazard = this.isRoadNearHazard(roadCoords, hazardZonesTyped);

      const hazardScore =
        useBpbdRisk && road.bpbdRiskScore
          ? this.calculateEnhancedHazardScore(road, isNearHazard)
          : this.calculateHazardScore(road, isNearHazard);

      const conditionScore = this.calculateConditionScore(road.condition);
      const distanceScore = this.calculateDistanceScoreSync(
        roadCoords,
        startLat,
        startLon,
        endLat,
        endLon,
        shelters,
      );

      const totalScore =
        hazardScore * this.WEIGHTS.hazard +
        conditionScore * this.WEIGHTS.roadCondition +
        distanceScore * this.WEIGHTS.distance;

      scoredRoutes.push({
        roadId: road.id,
        roadName: road.name,
        geometry: road.geometry,
        score: Math.round(totalScore * 100) / 100,
        breakdown: {
          hazardScore: Math.round(hazardScore * 100) / 100,
          conditionScore: Math.round(conditionScore * 100) / 100,
          distanceScore: Math.round(distanceScore * 100) / 100,
        },
      });
    }

    scoredRoutes.sort((a, b) => b.score - a.score);
    const topRoutes = scoredRoutes.slice(0, maxResults);

    const routesToSave: RouteScore[] = [];
    const bulkData = topRoutes.map((route) => {
      routesToSave.push(route);
      return {
        name: `Route ${route.roadName} (Score: ${route.score})`,
        geometry: route.geometry as import('@prisma/client').Prisma.JsonObject,
        type,
        score: route.score,
        startLat,
        startLon,
        endLat,
        endLon,
      };
    });

    if (bulkData.length > 0) {
      await this.prisma.evacuationRoute.createMany({
        data: bulkData,
      });
    }

    await this.redis.setJson(cacheKey, routesToSave, 3600);

    return routesToSave;
  }

  private extractCoordinates(
    geometry: RoadGeometry | null,
  ): [number, number][] {
    if (!geometry) return [];
    if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
      return geometry.coordinates as [number, number][];
    }
    if (
      geometry.type === 'MultiLineString' &&
      Array.isArray(geometry.coordinates)
    ) {
      const coords = geometry.coordinates[0];
      return Array.isArray(coords) ? (coords as [number, number][]) : [];
    }
    if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
      return [geometry.coordinates as [number, number]];
    }
    return [];
  }

  private isRoadNearHazard(
    coordinates: [number, number][],
    hazardZones: { geometry: HazardZoneGeometry | null }[],
  ): boolean {
    for (const coord of coordinates) {
      for (const zone of hazardZones) {
        const zoneGeom = zone.geometry;
        if (
          zoneGeom &&
          (zoneGeom.type === 'Polygon' || zoneGeom.type === 'MultiPolygon')
        ) {
          if (this.isPointInPolygon(coord, zoneGeom)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private isPointInPolygon(
    point: [number, number],
    polygon: HazardZoneGeometry,
  ): boolean {
    const [x, y] = point;
    let coords: number[][];

    if (polygon.type === 'MultiPolygon' && Array.isArray(polygon.coordinates)) {
      coords = polygon.coordinates[0][0] as number[][];
    } else if (
      polygon.type === 'Polygon' &&
      Array.isArray(polygon.coordinates)
    ) {
      coords = polygon.coordinates[0] as number[][];
    } else {
      return false;
    }

    let inside = false;

    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][0];
      const yi = coords[i][1];
      const xj = coords[j][0];
      const yj = coords[j][1];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  private calculateHazardScore(
    road: { vulnerability: RoadVulnerability },
    isNearHazard: boolean,
  ): number {
    const vulnerabilityScores: Record<RoadVulnerability, number> = {
      [RoadVulnerability.LOW]: 1,
      [RoadVulnerability.MEDIUM]: 2.5,
      [RoadVulnerability.HIGH]: 4,
      [RoadVulnerability.CRITICAL]: 5,
    };

    let baseScore = 2;

    if (isNearHazard) {
      baseScore = 3;
    }

    const vulnerability = vulnerabilityScores[road.vulnerability] || 2;
    baseScore = (baseScore + vulnerability) / 2;

    return Math.min(5, Math.max(1, baseScore));
  }

  /**
   * Calculate enhanced hazard score combining frequency analysis and BPBD risk
   * Formula: Hazard = (FrequencyScore * 0.5) + (BpbdScore_normalized * 0.5)
   * @param road - Road object with vulnerability and BPBD risk data
   * @param isNearHazard - Whether road is near hazard zone
   * @param hazardZones - Array of hazard zones
   * @returns Combined hazard score (1-5)
   */
  private calculateEnhancedHazardScore(
    road: { vulnerability: RoadVulnerability; bpbdRiskScore?: number | null },
    isNearHazard: boolean,
  ): number {
    const vulnerabilityScores: Record<RoadVulnerability, number> = {
      [RoadVulnerability.LOW]: 1,
      [RoadVulnerability.MEDIUM]: 2.5,
      [RoadVulnerability.HIGH]: 4,
      [RoadVulnerability.CRITICAL]: 5,
    };

    let frequencyScore = 2;
    if (isNearHazard) {
      frequencyScore = 3;
    }
    const vulnerability = vulnerabilityScores[road.vulnerability] || 2;
    frequencyScore = (frequencyScore + vulnerability) / 2;

    const bpbdScore = road.bpbdRiskScore ?? 1;
    const normalizedBpbd = ((bpbdScore - 1) / 2) * 4 + 1;

    const combinedHazard = frequencyScore * 0.5 + normalizedBpbd * 0.5;

    return Math.min(5, Math.max(1, combinedHazard));
  }

  private calculateConditionScore(condition: RoadCondition): number {
    const scores: Record<RoadCondition, number> = {
      [RoadCondition.GOOD]: 1,
      [RoadCondition.MODERATE]: 2.5,
      [RoadCondition.POOR]: 4,
      [RoadCondition.DAMAGED]: 5,
    };
    return scores[condition] || 3;
  }

  private calculateDistanceScoreSync(
    roadCoords: [number, number][],
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    shelters: { id: number; name: string; geometry: unknown }[],
  ): number {
    if (roadCoords.length < 2) return 3;

    const startDist = this.haversineDistance(
      startLat,
      startLon,
      roadCoords[0][1],
      roadCoords[0][0],
    );
    const endDist = this.haversineDistance(
      roadCoords[roadCoords.length - 1][1],
      roadCoords[roadCoords.length - 1][0],
      endLat,
      endLon,
    );

    const nearestShelter = this.findNearestShelter(roadCoords, shelters);
    const shelterDistance = nearestShelter?.distance || 5;

    const normalizedScore = Math.min(
      5,
      (startDist + endDist + shelterDistance) / 3,
    );
    return Math.max(1, normalizedScore);
  }

  private findNearestShelter(
    roadCoords: [number, number][],
    shelters: { id: number; name: string; geometry: unknown }[],
  ): ShelterWithDistance | null {
    let nearest: ShelterWithDistance | null = null;
    let minDistance = Infinity;

    for (const shelter of shelters) {
      const geom = shelter.geometry as RoadGeometry | null;
      const coords = geom?.coordinates;
      if (!Array.isArray(coords)) continue;

      for (const coord of roadCoords) {
        const lat2 = coords[1];
        const lon2 = coords[0];
        if (typeof lat2 !== 'number' || typeof lon2 !== 'number') continue;

        const dist = this.haversineDistance(coord[1], coord[0], lat2, lon2);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = {
            id: shelter.id,
            name: shelter.name,
            geometry: shelter.geometry,
            distance: dist,
          };
        }
      }
    }

    return nearest;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getRecommendedRoutes(params: { type?: RouteType; limit?: number }) {
    const { type, limit = 10 } = params;
    const where = type ? { type } : {};

    const routes = await this.prisma.evacuationRoute.findMany({
      where,
      orderBy: { score: 'asc' },
      take: limit,
    });

    return routes;
  }

  async getNearestShelter(lat: number, lon: number, limit: number = 5) {
    const shelters = await this.prisma.shelter.findMany();

    const sheltersWithDistance = shelters.map((shelter) => {
      const geom = shelter.geometry as unknown as RoadGeometry | null;
      const coords = geom?.coordinates;
      const shelterLat =
        coords && Array.isArray(coords) && typeof coords[1] === 'number'
          ? coords[1]
          : 0;
      const shelterLon =
        coords && Array.isArray(coords) && typeof coords[0] === 'number'
          ? coords[0]
          : 0;
      const distance = this.haversineDistance(lat, lon, shelterLat, shelterLon);

      return {
        ...shelter,
        distanceKm: Math.round(distance * 100) / 100,
      };
    });

    return sheltersWithDistance
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  getWeights() {
    return this.WEIGHTS;
  }

  updateWeights(weights: {
    hazard?: number;
    roadCondition?: number;
    distance?: number;
  }) {
    if (weights.hazard !== undefined) this.WEIGHTS.hazard = weights.hazard;
    if (weights.roadCondition !== undefined)
      this.WEIGHTS.roadCondition = weights.roadCondition;
    if (weights.distance !== undefined)
      this.WEIGHTS.distance = weights.distance;
    return this.WEIGHTS;
  }

  calculateDistanceScore(
    roadCoords: [number, number][],
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    shelters: { id: number; name: string; geometry: unknown }[],
  ): number {
    if (roadCoords.length < 2) return 3;

    const startDist = this.haversineDistance(
      startLat,
      startLon,
      roadCoords[0][1],
      roadCoords[0][0],
    );
    const endDist = this.haversineDistance(
      roadCoords[roadCoords.length - 1][1],
      roadCoords[roadCoords.length - 1][0],
      endLat,
      endLon,
    );

    const nearestShelter = this.findNearestShelter(roadCoords, shelters);
    const shelterDistance = nearestShelter?.distance || 5;

    const normalizedScore = Math.min(
      5,
      (startDist + endDist + shelterDistance) / 3,
    );
    return Math.max(1, normalizedScore);
  }

  async getEvacuationStatistics() {
    const [totalRoutes, byType, avgScore] = await Promise.all([
      this.prisma.evacuationRoute.count(),
      this.prisma.evacuationRoute.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.evacuationRoute.aggregate({
        _avg: { score: true },
      }),
    ]);

    return {
      totalRoutes,
      averageScore: avgScore._avg.score || 0,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }
}
