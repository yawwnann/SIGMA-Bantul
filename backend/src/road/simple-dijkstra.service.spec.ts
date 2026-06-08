import { Test, TestingModule } from '@nestjs/testing';
import { SimpleDijkstraService } from './simple-dijkstra.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SimpleDijkstraService', () => {
  let service: SimpleDijkstraService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimpleDijkstraService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SimpleDijkstraService>(SimpleDijkstraService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEdgeCost', () => {
    it('should use safe_cost if already calculated', () => {
      const road = {
        safe_cost: 1500,
        combinedHazard: 3,
        condition: 'GOOD',
      };

      const result = (service as any).calculateEdgeCost(road, 1000);

      expect(result).toBe(1500);
    });

    it('should calculate cost using combined hazard when available', () => {
      const road = {
        safe_cost: 0,
        combinedHazard: 3, // Combined hazard score (1-5)
        condition: 'GOOD',
      };
      const distance = 1000;

      const result = (service as any).calculateEdgeCost(road, distance);

      // Formula: distance * (1 + combinedHazard * 0.5 + conditionFactor * 0.3)
      // = 1000 * (1 + 3 * 0.5 + 0 * 0.3)
      // = 1000 * (1 + 1.5 + 0)
      // = 2500
      expect(result).toBe(2500);
    });

    it('should calculate cost with combined hazard and poor condition', () => {
      const road = {
        safe_cost: 0,
        combinedHazard: 4,
        condition: 'POOR',
      };
      const distance = 1000;

      const result = (service as any).calculateEdgeCost(road, distance);

      // Formula: distance * (1 + combinedHazard * 0.5 + conditionFactor * 0.3)
      // = 1000 * (1 + 4 * 0.5 + 0.7 * 0.3)
      // = 1000 * (1 + 2 + 0.21)
      // = 3210
      expect(result).toBe(3210);
    });

    it('should use legacy calculation when combinedHazard is not available', () => {
      const road = {
        safe_cost: 0,
        combinedHazard: null,
        condition: 'MODERATE',
        vulnerability: 'MEDIUM',
      };
      const distance = 1000;

      const result = (service as any).calculateEdgeCost(road, distance);

      // Legacy: distance * (1 + 0.3 (condition) + 0.3 (vulnerability))
      // = 1000 * 1.6
      // = 1600
      expect(result).toBe(1600);
    });

    it('should handle HIGH vulnerability in legacy mode', () => {
      const road = {
        safe_cost: 0,
        combinedHazard: null,
        condition: 'GOOD',
        vulnerability: 'HIGH',
      };
      const distance = 1000;

      const result = (service as any).calculateEdgeCost(road, distance);

      // Legacy: distance * (1 + 0 (condition) + 0.7 (vulnerability))
      // = 1000 * 1.7
      // = 1700
      expect(result).toBe(1700);
    });

    it('should handle CRITICAL vulnerability and DAMAGED condition in legacy mode', () => {
      const road = {
        safe_cost: 0,
        combinedHazard: null,
        condition: 'DAMAGED',
        vulnerability: 'CRITICAL',
      };
      const distance = 1000;

      const result = (service as any).calculateEdgeCost(road, distance);

      // Legacy: distance * (1 + 2.0 (condition) + 2.0 (vulnerability))
      // = 1000 * 5.0
      // = 5000
      expect(result).toBe(5000);
    });

    it('should calculate higher cost for higher combined hazard', () => {
      const distance = 1000;
      const condition = 'GOOD';

      const lowHazard = (service as any).calculateEdgeCost(
        { safe_cost: 0, combinedHazard: 1, condition },
        distance,
      );
      const mediumHazard = (service as any).calculateEdgeCost(
        { safe_cost: 0, combinedHazard: 3, condition },
        distance,
      );
      const highHazard = (service as any).calculateEdgeCost(
        { safe_cost: 0, combinedHazard: 5, condition },
        distance,
      );

      expect(mediumHazard).toBeGreaterThan(lowHazard);
      expect(highHazard).toBeGreaterThan(mediumHazard);
    });

    it('should match pgRouting safe_cost formula', () => {
      // Test that our formula matches the SQL formula in setup-pgrouting.sql
      // safe_cost = length * (1 + COALESCE(combinedHazard, 2) * 0.5)
      const road = {
        safe_cost: 0,
        combinedHazard: 3,
        condition: 'GOOD',
      };
      const distance = 1000;

      const result = (service as any).calculateEdgeCost(road, distance);

      // Our formula includes condition factor, but for GOOD condition it's 0
      // So it should match: 1000 * (1 + 3 * 0.5) = 2500
      expect(result).toBe(2500);
    });
  });

  describe('getConditionMultiplier', () => {
    it('should return correct multipliers for each condition', () => {
      const testCases = [
        { condition: 'GOOD', expected: 0 },
        { condition: 'MODERATE', expected: 0.3 },
        { condition: 'POOR', expected: 0.7 },
        { condition: 'DAMAGED', expected: 2.0 },
      ];

      testCases.forEach(({ condition, expected }) => {
        const result = (service as any).getConditionMultiplier(condition);
        expect(result).toBe(expected);
      });
    });

    it('should return 0 for unknown condition', () => {
      const result = (service as any).getConditionMultiplier('UNKNOWN');
      expect(result).toBe(0);
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between two points in meters', () => {
      // Distance between Bantul center and nearby point
      const lat1 = -7.888;
      const lon1 = 110.33;
      const lat2 = -7.889;
      const lon2 = 110.331;

      const distance = (service as any).haversineDistance(
        lat1,
        lon1,
        lat2,
        lon2,
      );

      // Should be approximately 150 meters
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(200);
    });

    it('should return 0 for same coordinates', () => {
      const distance = (service as any).haversineDistance(
        -7.888,
        110.33,
        -7.888,
        110.33,
      );

      expect(distance).toBeCloseTo(0, 1);
    });

    it('should calculate larger distances correctly', () => {
      // Distance between two cities (approx 100km)
      const lat1 = -7.888;
      const lon1 = 110.33;
      const lat2 = -6.888;
      const lon2 = 110.33;

      const distance = (service as any).haversineDistance(
        lat1,
        lon1,
        lat2,
        lon2,
      );

      // Should be approximately 111km (1 degree latitude ≈ 111km)
      expect(distance).toBeGreaterThan(100000);
      expect(distance).toBeLessThan(120000);
    });
  });

  describe('Cache Invalidation - Bug #4', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('isCacheStale should return true when no cache exists', () => {
      expect(service.isCacheStale()).toBe(true);
    });

    it('getCacheStats should report no cache initially', () => {
      const stats = service.getCacheStats();
      expect(stats.isCached).toBe(false);
      expect(stats.cacheAge).toBeNull();
      expect(stats.isStale).toBe(true);
      expect(stats.nodeCount).toBe(0);
    });

    it('clearCache should reset cache state', () => {
      (service as any).cachedGraph = { nodes: new Map(), edges: new Map() };
      (service as any).cacheTimestamp = Date.now();

      service.clearCache();

      expect((service as any).cachedGraph).toBeNull();
      expect((service as any).cacheTimestamp).toBeNull();
    });

    it('isCacheStale should return false when cache is fresh', () => {
      (service as any).cachedGraph = { nodes: new Map(), edges: new Map() };
      (service as any).cacheTimestamp = Date.now();

      expect(service.isCacheStale()).toBe(false);
    });

    it('isCacheStale should return true after TTL expires', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      (service as any).cachedGraph = { nodes: new Map(), edges: new Map() };
      (service as any).cacheTimestamp = now;

      jest.setSystemTime(now + 5 * 60 * 1000 + 1);
      expect(service.isCacheStale()).toBe(true);
    });

    it('clearCache with reason should log reason', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (service as any).cachedGraph = { nodes: new Map(), edges: new Map() };
      service.clearCache('Road data updated');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Road data updated'),
      );
      consoleSpy.mockRestore();
    });

    it('getCacheStats should report correct node/edge counts', () => {
      const nodes = new Map();
      nodes.set('A', { id: 'A', lat: 0, lon: 0 });
      nodes.set('B', { id: 'B', lat: 1, lon: 1 });
      (service as any).cachedGraph = { nodes, edges: new Map() };
      (service as any).cacheTimestamp = Date.now();

      const stats = service.getCacheStats();
      expect(stats.isCached).toBe(true);
      expect(stats.nodeCount).toBe(2);
    });
  });

  describe('Path Reconstruction - Bug #5', () => {
    function makeGraph() {
      const nodes = new Map<string, { id: string; lat: number; lon: number }>();
      nodes.set('A', { id: 'A', lat: -7.888, lon: 110.33 });
      nodes.set('B', { id: 'B', lat: -7.889, lon: 110.331 });
      nodes.set('C', { id: 'C', lat: -7.89, lon: 110.332 });

      const edges = new Map<string, any[]>();
      edges.set('A', [{ from: 'A', to: 'B', roadId: 1, distance: 150, cost: 150, conditionFactor: 0, coords: [] }]);
      edges.set('B', [
        { from: 'B', to: 'A', roadId: 1, distance: 150, cost: 150, conditionFactor: 0, coords: [] },
        { from: 'B', to: 'C', roadId: 2, distance: 200, cost: 200, conditionFactor: 0, coords: [] },
      ]);
      edges.set('C', [{ from: 'C', to: 'B', roadId: 2, distance: 200, cost: 200, conditionFactor: 0, coords: [] }]);

      return { nodes, edges };
    }

    it('should reconstruct path for connected graph', () => {
      const graph = makeGraph();
      const startNode = graph.nodes.get('A')!;
      const endNode = graph.nodes.get('C')!;

      const result = (service as any).dijkstra(graph, startNode, endNode);

      expect(result).not.toBeNull();
      expect(result.path).toEqual(['A', 'B', 'C']);
      expect(result.totalCost).toBe(350);
      expect(result.totalDistance).toBe(350);
    });

    it('should return null for disconnected graph (no path)', () => {
      const graph = makeGraph();
      const isolated = { id: 'D', lat: 0, lon: 0 };
      graph.nodes.set('D', isolated);
      graph.edges.set('D', []);

      const result = (service as any).dijkstra(graph, graph.nodes.get('A'), isolated);

      expect(result).toBeNull();
    });

    it('should warn when path reconstruction fails (disconnected)', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();
      const graph = makeGraph();
      graph.nodes.set('D', { id: 'D', lat: 0, lon: 0 });
      graph.edges.set('D', []);

      (service as any).dijkstra(graph, graph.nodes.get('A')!, graph.nodes.get('D')!);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Path reconstruction failed'),
      );
      warnSpy.mockRestore();
    });

    it('should use max iteration guard to prevent infinite loops', () => {
      const graph = makeGraph();
      const startNode = graph.nodes.get('A')!;
      const endNode = graph.nodes.get('C')!;

      const result = (service as any).dijkstra(graph, startNode, endNode);

      expect(result).not.toBeNull();
      expect(result!.path.length).toBeLessThanOrEqual(graph.nodes.size + 1);
    });

    it('should validate path starts at start node', () => {
      const graph = makeGraph();
      const result = (service as any).dijkstra(graph, graph.nodes.get('A')!, graph.nodes.get('C')!);

      expect(result).not.toBeNull();
      expect(result!.path[0]).toBe('A');
    });

    it('should validate path ends at end node', () => {
      const graph = makeGraph();
      const result = (service as any).dijkstra(graph, graph.nodes.get('A')!, graph.nodes.get('C')!);

      expect(result).not.toBeNull();
      expect(result!.path[result!.path.length - 1]).toBe('C');
    });

    it('should return 0 cost when start equals end', () => {
      const graph = makeGraph();
      const node = graph.nodes.get('A')!;

      const result = (service as any).dijkstra(graph, node, node);

      expect(result).not.toBeNull();
      expect(result!.totalCost).toBe(0);
      expect(result!.totalDistance).toBe(0);
      expect(result!.path).toEqual(['A']);
    });
  });

  describe('Cost Calculation Properties', () => {
    it('should ensure cost is always positive', () => {
      const testCases = [
        { combinedHazard: 1, condition: 'GOOD' },
        { combinedHazard: 3, condition: 'MODERATE' },
        { combinedHazard: 5, condition: 'DAMAGED' },
      ];

      testCases.forEach((road) => {
        const result = (service as any).calculateEdgeCost(
          { ...road, safe_cost: 0 },
          1000,
        );
        expect(result).toBeGreaterThan(0);
      });
    });

    it('should ensure cost increases with distance', () => {
      const road = {
        safe_cost: 0,
        combinedHazard: 3,
        condition: 'GOOD',
      };

      const cost1000 = (service as any).calculateEdgeCost(road, 1000);
      const cost2000 = (service as any).calculateEdgeCost(road, 2000);

      expect(cost2000).toBe(cost1000 * 2);
    });

    it('should ensure cost is bounded (reasonable upper limit)', () => {
      const road = {
        safe_cost: 0,
        combinedHazard: 5,
        condition: 'DAMAGED',
      };
      const distance = 1000;

      const result = (service as any).calculateEdgeCost(road, distance);

      // Maximum reasonable cost should be distance * some reasonable factor
      // With combinedHazard=5 and DAMAGED condition:
      // = 1000 * (1 + 5 * 0.5 + 2.0 * 0.3)
      // = 1000 * (1 + 2.5 + 0.6) = 4100
      expect(result).toBeLessThan(10000); // Reasonable upper bound
    });
  });
});
