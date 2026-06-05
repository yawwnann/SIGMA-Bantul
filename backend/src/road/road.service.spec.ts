import { Test, TestingModule } from '@nestjs/testing';
import { RoadService } from './road.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SimpleDijkstraService } from './simple-dijkstra.service';
import { NotFoundException } from '@nestjs/common';

const makeSegment = (overrides = {}) => ({
  id: 1,
  name: 'Road',
  type: 'LOKAL',
  condition: 'GOOD',
  cost: 100,
  length_m: 500,
  geometry: {
    type: 'LineString' as const,
    coordinates: [[110.33, -7.888] as [number, number], [110.331, -7.889] as [number, number]],
  },
  ...overrides,
});

describe('RoadService - SQL Injection Prevention', () => {
  let service: RoadService;
  let prisma: PrismaService;
  let simpleDijkstra: SimpleDijkstraService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    road: { count: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn() },
    evacuationRoute: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn() },
  };

  const mockRedisService = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn(), keys: jest.fn().mockResolvedValue([]) };
  const mockSimpleDijkstra = { calculateRoute: jest.fn(), clearCache: jest.fn() };

  const defaultRouteResult = {
    type: 'FeatureCollection' as const,
    properties: { routeId: 'PRIMARY', totalDistance: 500, totalTime: 1, segments: 1 },
    features: [{ type: 'Feature' as const, properties: { routeId: 'PRIMARY', totalDistance: 500, totalTime: 1, segments: 1 }, geometry: { type: 'LineString' as const, coordinates: [[110.33, -7.888], [110.331, -7.889]] }, segments: [] }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: SimpleDijkstraService, useValue: mockSimpleDijkstra },
      ],
    }).compile();

    service = module.get<RoadService>(RoadService);
    prisma = module.get<PrismaService>(PrismaService);
    simpleDijkstra = module.get<SimpleDijkstraService>(SimpleDijkstraService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRoute - SQL Injection Defense', () => {
    const startLat = -7.888, startLon = 110.33, endLat = -7.889, endLon = 110.331;

    function mockNearestNodes() {
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([{ node_id: 101 }])
        .mockResolvedValueOnce([{ node_id: 202 }]);
    }

    it('should validate IDs via type-guard before using in alternative route', async () => {
      mockNearestNodes();
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: 1 }), makeSegment({ id: 2, name: 'Road B', length_m: 600, geometry: { type: 'LineString', coordinates: [[110.331, -7.889], [110.332, -7.89]] } })])
        .mockResolvedValueOnce([]);

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const altCall = mockPrismaService.$queryRawUnsafe.mock.calls[1];
      expect(altCall).toBeDefined();
      const altInnerSql = altCall[1] as string;
      expect(altInnerSql).toMatch(/IN\s*\(\s*[0-9]+\s*(?:,\s*[0-9]+\s*)*\)/);
      expect(altInnerSql).toContain('1');
      expect(altInnerSql).toContain('2');
    });

    it('should reject non-integer edge IDs (string injection payload)', async () => {
      mockNearestNodes();
      mockSimpleDijkstra.calculateRoute.mockResolvedValue(defaultRouteResult);
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: '1; DROP TABLE "Road" --' })])

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
      expect(calls.length).toBe(1);
    });

    it('should reject negative edge IDs', async () => {
      mockNearestNodes();
      mockSimpleDijkstra.calculateRoute.mockResolvedValue(defaultRouteResult);
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: -1 })])

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
      expect(calls.length).toBe(1);
    });

    it('should filter out null/undefined edge IDs', async () => {
      mockNearestNodes();
      mockSimpleDijkstra.calculateRoute.mockResolvedValue(defaultRouteResult);
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: null }), makeSegment({ id: undefined })])

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
      expect(calls.length).toBe(1);
    });

    it('should reject zero and only allow positive integers > 0', async () => {
      mockNearestNodes();
      mockSimpleDijkstra.calculateRoute.mockResolvedValue(defaultRouteResult);
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: 0 }), makeSegment({ id: 5 })])

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const altCall = mockPrismaService.$queryRawUnsafe.mock.calls[1];
      expect(altCall).toBeDefined();
      const altInnerSql = altCall[1] as string;
      expect(altInnerSql).toContain('5');
      expect(altInnerSql).not.toContain('IN (0)');
    });

    it('should sanitize IDs character-by-character removing non-numeric', async () => {
      mockNearestNodes();
      mockSimpleDijkstra.calculateRoute.mockResolvedValue(defaultRouteResult);
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: '1 UNION SELECT * FROM "User" --' })])

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
      expect(calls.length).toBe(1);
    });

    it('should handle mixed valid and invalid IDs - only pass valid ones', async () => {
      mockNearestNodes();
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([
          makeSegment({ id: 1 }),
          makeSegment({ id: -1, name: 'Neg' }),
          makeSegment({ id: 0, name: 'Zero' }),
          makeSegment({ id: 3, name: 'Valid 3', length_m: 600, geometry: { type: 'LineString', coordinates: [[110.331, -7.889], [110.332, -7.89]] } }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const altCall = mockPrismaService.$queryRawUnsafe.mock.calls[1];
      expect(altCall).toBeDefined();
      const altInnerSql = altCall[1] as string;
      expect(altInnerSql).toContain('1');
      expect(altInnerSql).toContain('3');
      expect(altInnerSql).not.toContain('-1');
      expect(altInnerSql).not.toContain('IN (0)');
    });

    it('should enforce ID length limit', async () => {
      mockNearestNodes();
      mockSimpleDijkstra.calculateRoute.mockResolvedValue(defaultRouteResult);
      const longNum = Number('1'.repeat(50));
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: longNum, name: 'Long' })])

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const calls = mockPrismaService.$queryRawUnsafe.mock.calls;
      expect(calls.length).toBe(1);
    });

    it('should use parameterized query with $1, $2, $3 for alternative route', async () => {
      mockNearestNodes();
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([makeSegment({ id: 5 })])
        .mockResolvedValueOnce([]);

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(result).toBeDefined();

      const altCall = mockPrismaService.$queryRawUnsafe.mock.calls[1];
      expect(altCall).toBeDefined();
      const altQuery = altCall[0] as string;
      expect(altQuery).toContain('$1');
      expect(altQuery).toContain('$2');
      expect(altQuery).toContain('$3');
      expect(altCall[1]).toContain('5');
      expect(altCall[2]).toBe(101);
      expect(altCall[3]).toBe(202);
    });

    it('should fallback to simpleDijkstra when pgRouting fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('pgRouting unavailable'));
      mockSimpleDijkstra.calculateRoute.mockResolvedValue(defaultRouteResult);

      const result = await service.calculateRoute(startLat, startLon, endLat, endLon);
      expect(mockSimpleDijkstra.calculateRoute).toHaveBeenCalledWith(startLat, startLon, endLat, endLon);
      expect(result).toEqual(defaultRouteResult);
    });
  });

  describe('invalidateRoadCache', () => {
    it('should clear road-network and evacuation:route keys from Redis', async () => {
      mockRedisService.keys
        .mockResolvedValueOnce(['road-network:all', 'road-network:box1'])
        .mockResolvedValueOnce(['evacuation:route:1']);

      const count = await service.invalidateRoadCache();
      expect(count).toBe(3);
      expect(mockRedisService.del).toHaveBeenCalledTimes(3);
      expect(mockSimpleDijkstra.clearCache).toHaveBeenCalled();
    });

    it('should return 0 when Redis throws', async () => {
      mockRedisService.keys.mockRejectedValue(new Error('Redis down'));
      const count = await service.invalidateRoadCache();
      expect(count).toBe(0);
    });
  });

  describe('recalculateSafeCost', () => {
    it('should update safe_cost for all roads', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([10]);
      mockPrismaService.road.count.mockResolvedValue(10);
      const result = await service.recalculateSafeCost();
      expect(result.updated).toBe(10);
    });
  });

  describe('findById / update / delete', () => {
    it('should throw NotFoundException when road does not exist', async () => {
      mockPrismaService.road.findUnique.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });

    it('should return road when found', async () => {
      const road = { id: 1, name: 'Test Road' };
      mockPrismaService.road.findUnique.mockResolvedValue(road);
      expect(await service.findById(1)).toEqual(road);
    });
  });

  describe('getRoadNetwork', () => {
    it('should serve from cache if available', async () => {
      const cached = { type: 'FeatureCollection', features: [] };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cached));
      const result = await service.getRoadNetwork();
      expect(result).toEqual(cached);
      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('should query DB when cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      const result = await service.getRoadNetwork();
      expect(result).toBeDefined();
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });
});
