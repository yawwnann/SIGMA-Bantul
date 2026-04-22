import { Test, TestingModule } from '@nestjs/testing';
import { EvacuationService } from './evacuation.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RoadVulnerability } from '@prisma/client';

describe('EvacuationService', () => {
  let service: EvacuationService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    road: {
      findMany: jest.fn(),
    },
    shelter: {
      findMany: jest.fn(),
    },
    hazardZone: {
      findMany: jest.fn(),
    },
    evacuationRoute: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockRedisService = {
    getJson: jest.fn(),
    setJson: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvacuationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<EvacuationService>(EvacuationService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEnhancedHazardScore', () => {
    it('should calculate combined hazard with LOW vulnerability and LOW BPBD risk', () => {
      const road = {
        vulnerability: RoadVulnerability.LOW,
        bpbdRiskScore: 1,
      };

      const result = (service as any).calculateEnhancedHazardScore(
        road,
        false,
        [],
      );

      // Frequency: (2 + 1) / 2 = 1.5
      // BPBD normalized: ((1 - 1) / 2) * 4 + 1 = 1
      // Combined: 1.5 * 0.5 + 1 * 0.5 = 1.25
      expect(result).toBeCloseTo(1.25, 2);
    });

    it('should calculate combined hazard with HIGH vulnerability and HIGH BPBD risk', () => {
      const road = {
        vulnerability: RoadVulnerability.HIGH,
        bpbdRiskScore: 3,
      };

      const result = (service as any).calculateEnhancedHazardScore(
        road,
        true,
        [],
      );

      // Frequency: (3 + 4) / 2 = 3.5
      // BPBD normalized: ((3 - 1) / 2) * 4 + 1 = 5
      // Combined: 3.5 * 0.5 + 5 * 0.5 = 4.25
      expect(result).toBeCloseTo(4.25, 2);
    });

    it('should calculate combined hazard with MEDIUM vulnerability and MEDIUM BPBD risk', () => {
      const road = {
        vulnerability: RoadVulnerability.MEDIUM,
        bpbdRiskScore: 2,
      };

      const result = (service as any).calculateEnhancedHazardScore(
        road,
        false,
        [],
      );

      // Frequency: (2 + 2.5) / 2 = 2.25
      // BPBD normalized: ((2 - 1) / 2) * 4 + 1 = 3
      // Combined: 2.25 * 0.5 + 3 * 0.5 = 2.625
      expect(result).toBeCloseTo(2.625, 2);
    });

    it('should normalize BPBD score correctly (1-3 to 1-5 scale)', () => {
      const testCases = [
        { bpbdScore: 1, expected: 1 }, // ((1-1)/2)*4+1 = 1
        { bpbdScore: 2, expected: 3 }, // ((2-1)/2)*4+1 = 3
        { bpbdScore: 3, expected: 5 }, // ((3-1)/2)*4+1 = 5
      ];

      testCases.forEach(({ bpbdScore, expected }) => {
        const road = {
          vulnerability: RoadVulnerability.LOW,
          bpbdRiskScore: bpbdScore,
        };

        const result = (service as any).calculateEnhancedHazardScore(
          road,
          false,
          [],
        );

        // Frequency: (2 + 1) / 2 = 1.5
        // Combined: 1.5 * 0.5 + expected * 0.5
        const expectedResult = 1.5 * 0.5 + expected * 0.5;
        expect(result).toBeCloseTo(expectedResult, 2);
      });
    });

    it('should default to BPBD score 1 if not provided', () => {
      const road = {
        vulnerability: RoadVulnerability.MEDIUM,
        bpbdRiskScore: null,
      };

      const result = (service as any).calculateEnhancedHazardScore(
        road,
        false,
        [],
      );

      // Should use bpbdScore = 1 as default
      // Frequency: (2 + 2.5) / 2 = 2.25
      // BPBD normalized: 1
      // Combined: 2.25 * 0.5 + 1 * 0.5 = 1.625
      expect(result).toBeCloseTo(1.625, 2);
    });

    it('should return score between 1 and 5', () => {
      const testCases = [
        {
          vulnerability: RoadVulnerability.LOW,
          bpbdRiskScore: 1,
          isNearHazard: false,
        },
        {
          vulnerability: RoadVulnerability.HIGH,
          bpbdRiskScore: 3,
          isNearHazard: true,
        },
        {
          vulnerability: RoadVulnerability.CRITICAL,
          bpbdRiskScore: 3,
          isNearHazard: true,
        },
      ];

      testCases.forEach((testCase) => {
        const result = (service as any).calculateEnhancedHazardScore(
          testCase,
          testCase.isNearHazard,
          [],
        );

        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(5);
      });
    });

    it('should apply 50-50 weight between frequency and BPBD', () => {
      const road = {
        vulnerability: RoadVulnerability.MEDIUM,
        bpbdRiskScore: 2,
      };

      const result = (service as any).calculateEnhancedHazardScore(
        road,
        false,
        [],
      );

      // Verify the formula: (frequency * 0.5) + (bpbd_normalized * 0.5)
      // Frequency: (2 + 2.5) / 2 = 2.25
      // BPBD normalized: 3
      // Combined: 2.25 * 0.5 + 3 * 0.5 = 2.625
      expect(result).toBeCloseTo(2.625, 2);
    });
  });

  describe('calculateHazardScore (legacy)', () => {
    it('should calculate hazard score without BPBD data', () => {
      const road = {
        vulnerability: RoadVulnerability.MEDIUM,
      };

      const result = (service as any).calculateHazardScore(road, false, []);

      // Base: 2, Vulnerability: 2.5
      // Combined: (2 + 2.5) / 2 = 2.25
      expect(result).toBeCloseTo(2.25, 2);
    });

    it('should increase score when near hazard', () => {
      const road = {
        vulnerability: RoadVulnerability.LOW,
      };

      const resultNotNear = (service as any).calculateHazardScore(
        road,
        false,
        [],
      );
      const resultNear = (service as any).calculateHazardScore(road, true, []);

      expect(resultNear).toBeGreaterThan(resultNotNear);
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between two points', () => {
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

      // Should be approximately 0.15 km
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });

    it('should return 0 for same coordinates', () => {
      const distance = (service as any).haversineDistance(
        -7.888,
        110.33,
        -7.888,
        110.33,
      );

      expect(distance).toBeCloseTo(0, 5);
    });
  });

  describe('getWeights', () => {
    it('should return current weights', async () => {
      const weights = await service.getWeights();

      expect(weights).toHaveProperty('hazard');
      expect(weights).toHaveProperty('roadCondition');
      expect(weights).toHaveProperty('distance');
      expect(weights.hazard + weights.roadCondition + weights.distance).toBe(1);
    });
  });

  describe('updateWeights', () => {
    it('should update weights', async () => {
      const newWeights = {
        hazard: 0.6,
        roadCondition: 0.25,
        distance: 0.15,
      };

      const result = await service.updateWeights(newWeights);

      expect(result.hazard).toBe(0.6);
      expect(result.roadCondition).toBe(0.25);
      expect(result.distance).toBe(0.15);
    });
  });
});
