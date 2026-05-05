import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoadDto } from './dto/create-road.dto';
import { RoadCondition, RoadType } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { SimpleDijkstraService } from './simple-dijkstra.service';

@Injectable()
export class RoadService {
  private readonly logger = new (require('@nestjs/common').Logger)(
    RoadService.name,
  );

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private simpleDijkstra: SimpleDijkstraService,
  ) {}

  /**
   * Invalidate all road-related caches in Redis.
   * Called automatically after create/update/delete operations.
   * Can also be called manually via API endpoint after bulk imports.
   */
  async invalidateRoadCache(): Promise<number> {
    try {
      const roadKeys = await this.redis.keys('road-network:*');
      const evacKeys = await this.redis.keys('evacuation:route:*');
      const allKeys = [...roadKeys, ...evacKeys];

      if (allKeys.length > 0) {
        for (const key of allKeys) {
          await this.redis.del(key);
        }
        this.logger.log(
          `Invalidated ${allKeys.length} road/evacuation cache keys`,
        );
      }

      this.simpleDijkstra.clearCache();
      return allKeys.length;
    } catch (error) {
      this.logger.warn(`Failed to invalidate road cache: ${error.message}`);
      return 0;
    }
  }

  /**
   * Recalculate safe_cost for all roads using combined hazard score
   * Formula: safe_cost = length * (1 + combinedHazard * 0.5)
   * Should be called after BPBD risk assignment
   */
  async recalculateSafeCost(): Promise<{ updated: number }> {
    this.logger.log(
      'Recalculating safe_cost for all roads with combined hazard...',
    );

    try {
      // Update safe_cost based on combined hazard
      await this.prisma.$executeRaw`
        UPDATE "Road"
        SET 
          safe_cost = COALESCE(length, 1) * (1 + COALESCE("combinedHazard", 2) * 0.5),
          "updatedAt" = NOW()
        WHERE geom IS NOT NULL
      `;

      const count = await this.prisma.road.count({
        where: { safe_cost: { not: null } },
      });

      // Invalidate cache after recalculation
      await this.invalidateRoadCache();

      this.logger.log(`Safe cost recalculated for ${count} roads`);
      return { updated: count };
    } catch (error) {
      this.logger.error('Failed to recalculate safe_cost', error.stack);
      throw error;
    }
  }

  async create(dto: CreateRoadDto) {
    const road = await this.prisma.road.create({
      data: dto,
    });
    await this.invalidateRoadCache();
    return road;
  }

  async findAll(params?: {
    condition?: RoadCondition | 'all';
    type?: RoadType | 'all';
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { condition, type, page = 1, limit = 20, search } = params || {};
    const skip = (page - 1) * limit;

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (condition && condition !== 'all') {
      whereClauses.push(`condition::text = $${paramIndex}`);
      queryParams.push(condition);
      paramIndex++;
    }
    if (type && type !== 'all') {
      whereClauses.push(`type::text = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }
    if (search && search.trim()) {
      whereClauses.push(`name ILIKE $${paramIndex}`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereSQL =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query with sort: real names first, then fallback names
    const countQuery = `SELECT COUNT(*)::int as cnt FROM "Road" ${whereSQL}`;
    const dataQuery = `
      SELECT id, name, type, condition, vulnerability, length, safe_cost, source, target,
             geometry, "createdAt", "updatedAt"
      FROM "Road" 
      ${whereSQL}
      ORDER BY 
        CASE WHEN name LIKE 'Jalan Lokal #%' THEN 1 ELSE 0 END ASC,
        name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...queryParams, limit, skip];
    const countParams = [...queryParams];

    const [data, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(dataQuery, ...dataParams),
      this.prisma.$queryRawUnsafe<any[]>(countQuery, ...countParams),
    ]);

    const total = countResult[0]?.cnt || 0;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    const road = await this.prisma.road.findUnique({ where: { id } });
    if (!road) {
      throw new NotFoundException(`Road with ID ${id} not found`);
    }
    return road;
  }

  async update(id: number, dto: CreateRoadDto) {
    await this.findById(id);
    const road = await this.prisma.road.update({
      where: { id },
      data: dto,
    });
    await this.invalidateRoadCache();
    return road;
  }

  async delete(id: number) {
    await this.findById(id);
    const road = await this.prisma.road.delete({ where: { id } });
    await this.invalidateRoadCache();
    return road;
  }

  async getStatistics() {
    const [total, byCondition, byType, totalLength] = await Promise.all([
      this.prisma.road.count(),
      this.prisma.road.groupBy({
        by: ['condition'],
        _count: true,
      }),
      this.prisma.road.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.road.aggregate({ _sum: { length: true } }),
    ]);

    return {
      total,
      totalLength: totalLength._sum.length || 0,
      byCondition: byCondition.map((item) => ({
        condition: item.condition,
        count: item._count,
      })),
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }

  /**
   * Get road network as GeoJSON for map overlay
   * Cached for 1 hour
   */
  async getRoadNetwork(bounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) {
    const cacheKey = bounds
      ? `road-network:${bounds.minLat}:${bounds.maxLat}:${bounds.minLon}:${bounds.maxLon}`
      : 'road-network:all';

    // Try to get from cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.log(`Road network served from cache (key: ${cacheKey})`);
        return JSON.parse(cached);
      }
    } catch (err) {
      this.logger.warn(
        `Redis cache read failed, fetching from DB: ${err.message}`,
      );
    }

    // Build query - get roads within bounds if specified
    let roads;
    if (bounds) {
      roads = await this.prisma.$queryRaw<any[]>`
        SELECT 
          id,
          name,
          type,
          condition,
          vulnerability,
          "bpbdRiskLevel",
          "bpbdRiskScore",
          "combinedHazard",
          safe_cost,
          ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00005), 5)::json as geojson
        FROM "Road"
        WHERE ST_Intersects(
          geom,
          ST_MakeEnvelope(${bounds.minLon}, ${bounds.minLat}, ${bounds.maxLon}, ${bounds.maxLat}, 4326)
        )
        ORDER BY type, name
      `;
    } else {
      roads = await this.prisma.$queryRaw<any[]>`
        SELECT 
          id,
          name,
          type,
          condition,
          vulnerability,
          "bpbdRiskLevel",
          "bpbdRiskScore",
          "combinedHazard",
          safe_cost,
          ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00005), 5)::json as geojson
        FROM "Road"
        ORDER BY type, name
      `;
    }

    // Convert to GeoJSON FeatureCollection
    const geojson = {
      type: 'FeatureCollection',
      features: roads.map((road) => ({
        type: 'Feature',
        id: road.id,
        properties: {
          id: road.id,
          name: road.name,
          type: road.type,
          condition: road.condition,
          vulnerability: road.vulnerability,
          bpbdRiskLevel: road.bpbdRiskLevel,
          bpbdRiskScore: road.bpbdRiskScore,
          combinedHazard: road.combinedHazard,
          safeCost: road.safe_cost,
        },
        geometry: road.geojson,
      })),
    };

    // Cache for 1 hour
    await this.redis.set(cacheKey, JSON.stringify(geojson), 3600);

    return geojson;
  }

  /**
   * Calculate shortest path using Dijkstra algorithm (pgRouting)
   * Falls back to simple Dijkstra if pgRouting is not available
   */
  async calculateRoute(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
  ) {
    try {
      // Try pgRouting first
      return await this.calculateRouteWithPgRouting(
        startLat,
        startLon,
        endLat,
        endLon,
      );
    } catch (error) {
      console.log('pgRouting not available, using simple Dijkstra...');
      // Fallback to simple Dijkstra
      return await this.simpleDijkstra.calculateRoute(
        startLat,
        startLon,
        endLat,
        endLon,
      );
    }
  }

  /**
   * Calculate route using pgRouting (requires pgRouting extension)
   */
  private async calculateRouteWithPgRouting(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
  ) {
    try {
      // Find nearest road nodes to start and end points
      const startNode = await this.prisma.$queryRaw<any[]>`
        SELECT source as node_id
        FROM "Road"
        WHERE source IS NOT NULL
        ORDER BY ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint(${startLon}, ${startLat}), 4326)::geography
        )
        LIMIT 1
      `;

      const endNode = await this.prisma.$queryRaw<any[]>`
        SELECT target as node_id
        FROM "Road"
        WHERE target IS NOT NULL
        ORDER BY ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint(${endLon}, ${endLat}), 4326)::geography
        )
        LIMIT 1
      `;

      if (!startNode.length || !endNode.length) {
        throw new Error('Could not find nearby roads');
      }

      // Calculate shortest path using pgr_dijkstra
      const route = await this.prisma.$queryRaw<any[]>`
        SELECT 
          r.id,
          r.name,
          r.type,
          r.condition,
          r.cost,
          ST_AsGeoJSON(r.geom)::json as geometry
        FROM pgr_dijkstra(
          'SELECT id, source, target, cost, reverse_cost FROM "Road" WHERE source IS NOT NULL AND target IS NOT NULL',
          ${startNode[0].node_id},
          ${endNode[0].node_id},
          directed := false
        ) AS route
        JOIN "Road" r ON route.edge = r.id
        ORDER BY route.seq
      `;

      if (!route.length) {
        throw new Error('No route found');
      }

      // Calculate total distance and time
      const totalDistance = route.reduce(
        (sum, segment) => sum + (segment.length_m || 0),
        0,
      );
      const totalTime = route.reduce(
        (sum, segment) => sum + (segment.cost || 0),
        0,
      );

      // Combine all geometries into a single LineString
      const coordinates = route.flatMap((segment) => {
        const geom = segment.geometry;
        return geom.type === 'LineString' ? geom.coordinates : [];
      });

      return {
        type: 'Feature',
        properties: {
          totalDistance: Math.round(totalDistance),
          totalTime: Math.round(totalTime),
          segments: route.length,
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
        segments: route.map((seg) => ({
          id: seg.id,
          name: seg.name,
          type: seg.type,
          condition: seg.condition,
          distance: Math.round(seg.length_m || 0),
          time: Math.round(seg.cost || 0),
        })),
      };
    } catch (error) {
      console.error('Error calculating route:', error);
      throw error;
    }
  }
}
