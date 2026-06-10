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

interface EvacuationLocationWithDistance {
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
    // Load all evacuationLocations and filter out full ones considering inbound users
    const allEvacuationLocations = await this.prisma.evacuationLocation.findMany();
    const evacuationLocations = [];
    const now = Date.now();
    const timeoutMs = 45 * 60 * 1000;

    for (const loc of allEvacuationLocations) {
      const cacheKey = `evacuation-location:${loc.id}:inbound`;
      const inboundUsers = await this.redis.getJson<{deviceId: string, timestamp: number}[]>(cacheKey) || [];
      const validUsers = inboundUsers.filter(u => now - u.timestamp < timeoutMs);
      
      if (loc.currentOccupancy + validUsers.length < loc.capacity) {
        evacuationLocations.push(loc);
      }
    }

    if (evacuationLocations.length === 0) {
      this.logger.warn('No available evacuationLocations found!');
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
        evacuationLocations,
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
    evacuationLocations: { id: number; name: string; geometry: unknown }[],
  ): number {
    if (roadCoords.length < 2) return 3;

    // FIX: GeoJSON uses [lon, lat] format, so:
    // roadCoords[n][0] = longitude
    // roadCoords[n][1] = latitude
    const roadStartLon = roadCoords[0][0];
    const roadStartLat = roadCoords[0][1];
    const roadEndLon = roadCoords[roadCoords.length - 1][0];
    const roadEndLat = roadCoords[roadCoords.length - 1][1];

    const startDist = this.haversineDistance(
      startLat,
      startLon,
      roadStartLat,
      roadStartLon,
    );
    const endDist = this.haversineDistance(
      roadEndLat,
      roadEndLon,
      endLat,
      endLon,
    );

    const nearestEvacuationLocation = this.findNearestEvacuationLocation(
      roadCoords,
      evacuationLocations,
    );
    const evacuationLocationDistance = nearestEvacuationLocation?.distance || 5;

    const normalizedScore = Math.min(
      5,
      (startDist + endDist + evacuationLocationDistance) / 3,
    );
    return Math.max(1, normalizedScore);
  }

  private findNearestEvacuationLocation(
    roadCoords: [number, number][],
    evacuationLocations: { id: number; name: string; geometry: unknown }[],
  ): EvacuationLocationWithDistance | null {
    let nearest: EvacuationLocationWithDistance | null = null;
    let minDistance = Infinity;

    for (const evacuationLocation of evacuationLocations) {
      const geom = evacuationLocation.geometry as RoadGeometry | null;
      const coords = geom?.coordinates;
      if (!Array.isArray(coords)) continue;

      // FIX: GeoJSON uses [lon, lat] format
      // coords[0] = longitude, coords[1] = latitude
      const evacLon = coords[0];
      const evacLat = coords[1];

      if (typeof evacLat !== 'number' || typeof evacLon !== 'number') continue;

      for (const coord of roadCoords) {
        // FIX: coord[0] = longitude (lon), coord[1] = latitude (lat) in GeoJSON
        const roadLon = coord[0];
        const roadLat = coord[1];

        if (typeof roadLon !== 'number' || typeof roadLat !== 'number') continue;

        const dist = this.haversineDistance(roadLat, roadLon, evacLat, evacLon);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = {
            id: evacuationLocation.id,
            name: evacuationLocation.name,
            geometry: evacuationLocation.geometry,
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

  async getNearestEvacuationLocation(
    lat: number,
    lon: number,
    limit: number = 5,
  ) {
    const evacuationLocations = await this.prisma.evacuationLocation.findMany();

    // 1. Calculate distance and occupancy rate for all locations
    const locationsProcessed = evacuationLocations.map((loc) => {
      const geom = loc.geometry as unknown as RoadGeometry | null;
      const coords = geom?.coordinates;
      const locLat =
        coords && Array.isArray(coords) && typeof coords[1] === 'number' ? coords[1] : 0;
      const locLon =
        coords && Array.isArray(coords) && typeof coords[0] === 'number' ? coords[0] : 0;
      
      const distance = this.haversineDistance(lat, lon, locLat, locLon);
      const occupancyRate = loc.capacity > 0 ? loc.currentOccupancy / loc.capacity : 1;
      
      return {
        ...loc,
        distanceKm: Math.round(distance * 100) / 100,
        occupancyRate,
      };
    });

    // Sort all by distance first
    locationsProcessed.sort((a, b) => a.distanceKm - b.distanceKm);

    // 2. Dynamic Radius Expansion with 15% Buffer (Max 85% occupancy)
    const searchRadii = [5, 10, 20, 50]; // Radii in km
    const MAX_OCCUPANCY_RATE = 0.85; // 15% Buffer

    for (const radius of searchRadii) {
      const validLocations = locationsProcessed.filter(
        (loc) => loc.distanceKm <= radius && loc.occupancyRate <= MAX_OCCUPANCY_RATE
      );

      if (validLocations.length >= limit || (validLocations.length > 0 && radius === 50)) {
        // Return if we hit the limit, OR if we're at max radius and found at least one
        return validLocations.slice(0, limit);
      }
      // Wait, if it finds 1 location at 5km, but limit is 5, should it return 1 or expand to 10km to find more?
      // For routing, finding 1 good location is often enough, but since limit is usually 5,
      // it's better to return whatever we found if it's > 0, to avoid sending people 10km away just to fill the "limit".
      if (validLocations.length > 0) {
         return validLocations.slice(0, limit);
      }
    }

    // 3. Fallback 1: Open Space (FIELD) regardless of capacity buffer
    const openSpaces = locationsProcessed.filter(
      (loc) => loc.category === 'FIELD'
    );
    
    if (openSpaces.length > 0) {
      return openSpaces.slice(0, limit);
    }

    // 4. Fallback 2: Least Overcapacity
    // Sort by occupancy rate ascending, then distance
    locationsProcessed.sort((a, b) => {
      if (a.occupancyRate === b.occupancyRate) {
        return a.distanceKm - b.distanceKm;
      }
      return a.occupancyRate - b.occupancyRate;
    });

    return locationsProcessed.slice(0, limit);
  }

  getWeights() {
    return { ...this.WEIGHTS };
  }

  /**
   * Update scoring weights with validation
   * Total weight must equal 1.0 (100%)
   * @throws BadRequestException if weights don't sum to 1.0 or values are invalid
   */
  updateWeights(weights: {
    hazard?: number;
    roadCondition?: number;
    distance?: number;
  }) {
    // Calculate new weight values
    const newWeights = {
      hazard: weights.hazard ?? this.WEIGHTS.hazard,
      roadCondition: weights.roadCondition ?? this.WEIGHTS.roadCondition,
      distance: weights.distance ?? this.WEIGHTS.distance,
    };

    // Validate each weight is a valid number in range [0, 1]
    const validateWeight = (name: string, value: number): void => {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Invalid weight value for ${name}: must be a number`);
      }
      if (value < 0 || value > 1) {
        throw new Error(`Invalid weight value for ${name}: must be between 0 and 1`);
      }
    };

    validateWeight('hazard', newWeights.hazard);
    validateWeight('roadCondition', newWeights.roadCondition);
    validateWeight('distance', newWeights.distance);

    // Validate sum equals 1.0 (with tolerance for floating point)
    const sum = newWeights.hazard + newWeights.roadCondition + newWeights.distance;
    const TOLERANCE = 0.0001; // Allow small floating point variance

    if (Math.abs(sum - 1.0) > TOLERANCE) {
      throw new Error(
        `Weight sum must equal 1.0, got ${sum.toFixed(4)}. ` +
        `Current weights: hazard=${newWeights.hazard}, roadCondition=${newWeights.roadCondition}, distance=${newWeights.distance}`
      );
    }

    // All validations passed, update weights
    this.WEIGHTS.hazard = newWeights.hazard;
    this.WEIGHTS.roadCondition = newWeights.roadCondition;
    this.WEIGHTS.distance = newWeights.distance;

    this.logger.log(
      `Weights updated: hazard=${this.WEIGHTS.hazard}, ` +
      `roadCondition=${this.WEIGHTS.roadCondition}, distance=${this.WEIGHTS.distance}`
    );

    return { ...this.WEIGHTS };
  }

  calculateDistanceScore(
    roadCoords: [number, number][],
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    evacuationLocations: { id: number; name: string; geometry: unknown }[],
  ): number {
    if (roadCoords.length < 2) return 3;

    // FIX: GeoJSON uses [lon, lat] format
    // roadCoords[n][0] = longitude, roadCoords[n][1] = latitude
    const roadStartLon = roadCoords[0][0];
    const roadStartLat = roadCoords[0][1];
    const roadEndLon = roadCoords[roadCoords.length - 1][0];
    const roadEndLat = roadCoords[roadCoords.length - 1][1];

    const startDist = this.haversineDistance(
      startLat,
      startLon,
      roadStartLat,
      roadStartLon,
    );
    const endDist = this.haversineDistance(
      roadEndLat,
      roadEndLon,
      endLat,
      endLon,
    );

    const nearestEvacuationLocation = this.findNearestEvacuationLocation(
      roadCoords,
      evacuationLocations,
    );
    const evacuationLocationDistance = nearestEvacuationLocation?.distance || 5;

    const normalizedScore = Math.min(
      5,
      (startDist + endDist + evacuationLocationDistance) / 3,
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
