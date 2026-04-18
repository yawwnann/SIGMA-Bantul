import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  RouteType,
  HazardLevel,
  RoadCondition,
  RoadVulnerability,
} from '@prisma/client';

interface RouteScore {
  roadId: number;
  roadName: string;
  geometry: any;
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
  geometry: any;
  distance: number;
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
  ) {
    const cacheKey = `evacuation:route:${startLat}:${startLon}:${endLat}:${endLon}:${type}`;
    const cached = await this.redis.getJson<any[]>(cacheKey);
    if (cached) return cached;

    const roads = await this.prisma.road.findMany();
    const shelters = await this.prisma.shelter.findMany();
    const hazardZones = await this.prisma.hazardZone.findMany();

    const scoredRoutes: RouteScore[] = [];

    for (const road of roads) {
      const geometry = road.geometry as any;
      const roadCoords = this.extractCoordinates(geometry);

      const isNearHazard = this.isRoadNearHazard(roadCoords, hazardZones);
      const hazardScore = this.calculateHazardScore(
        road,
        isNearHazard,
        hazardZones,
      );
      const conditionScore = this.calculateConditionScore(road.condition);
      const distanceScore = await this.calculateDistanceScore(
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

    const routesToSave: any[] = [];
    for (const route of topRoutes) {
      const savedRoute = await this.prisma.evacuationRoute.create({
        data: {
          name: `Route ${route.roadName} (Score: ${route.score})`,
          geometry: route.geometry,
          type,
          score: route.score,
          startLat,
          startLon,
          endLat,
          endLon,
        },
      });
      routesToSave.push({
        ...savedRoute,
        breakdown: route.breakdown,
      });
    }

    await this.redis.setJson(cacheKey, routesToSave, 3600);

    return routesToSave;
  }

  private extractCoordinates(geometry: any): [number, number][] {
    if (geometry?.type === 'LineString' && geometry?.coordinates) {
      return geometry.coordinates;
    }
    if (geometry?.type === 'MultiLineString' && geometry?.coordinates) {
      return geometry.coordinates[0] || [];
    }
    if (geometry?.type === 'Point' && geometry?.coordinates) {
      return [geometry.coordinates];
    }
    return [];
  }

  private isRoadNearHazard(
    coordinates: [number, number][],
    hazardZones: any[],
  ): boolean {
    const bufferDeg = 0.01;
    for (const coord of coordinates) {
      for (const zone of hazardZones) {
        const zoneGeom = zone.geometry;
        if (zoneGeom?.type === 'Polygon' || zoneGeom?.type === 'MultiPolygon') {
          if (this.isPointInPolygon(coord, zoneGeom)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private isPointInPolygon(point: [number, number], polygon: any): boolean {
    const [x, y] = point;
    const coords =
      polygon.type === 'MultiPolygon'
        ? polygon.coordinates[0][0]
        : polygon.coordinates[0];
    let inside = false;

    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][0],
        yi = coords[i][1];
      const xj = coords[j][0],
        yj = coords[j][1];

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  private calculateHazardScore(
    road: any,
    isNearHazard: boolean,
    hazardZones: any[],
  ): number {
    const levelScores: Record<HazardLevel, number> = {
      [HazardLevel.LOW]: 1,
      [HazardLevel.MEDIUM]: 3,
      [HazardLevel.HIGH]: 4,
      [HazardLevel.CRITICAL]: 5,
    };

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

  private calculateConditionScore(condition: RoadCondition): number {
    const scores: Record<RoadCondition, number> = {
      [RoadCondition.GOOD]: 1,
      [RoadCondition.MODERATE]: 2.5,
      [RoadCondition.POOR]: 4,
      [RoadCondition.DAMAGED]: 5,
    };
    return scores[condition] || 3;
  }

  private async calculateDistanceScore(
    roadCoords: [number, number][],
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    shelters: any[],
  ): Promise<number> {
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
    shelters: any[],
  ): ShelterWithDistance | null {
    let nearest: ShelterWithDistance | null = null;
    let minDistance = Infinity;

    for (const shelter of shelters) {
      const coords = (shelter.geometry as any)?.coordinates;
      if (!coords) continue;

      for (const coord of roadCoords) {
        const dist = this.haversineDistance(
          coord[1],
          coord[0],
          coords[1],
          coords[0],
        );
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
      const coords = (shelter.geometry as any)?.coordinates;
      const shelterLat = coords?.[1] || 0;
      const shelterLon = coords?.[0] || 0;
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

  async getWeights() {
    return this.WEIGHTS;
  }

  async updateWeights(weights: {
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
