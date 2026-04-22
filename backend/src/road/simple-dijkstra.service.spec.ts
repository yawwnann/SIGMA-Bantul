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
