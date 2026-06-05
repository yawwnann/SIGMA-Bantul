import { Test, TestingModule } from '@nestjs/testing';
import { BpbdRiskService } from './bpbd-risk.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BpbdRiskService - Bug #7 Combined Hazard', () => {
  let service: BpbdRiskService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
    road: { count: jest.fn() },
    bpbdRiskZone: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BpbdRiskService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BpbdRiskService>(BpbdRiskService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recalculateCombinedHazard', () => {
    it('should execute 3 SQL updates for combined hazard + safe_cost', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([1]);

      await service.recalculateCombinedHazard();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it('should update combinedHazard for ALL roads with vulnerability (not just bpbd)', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([1]);

      await service.recalculateCombinedHazard();

      const firstCall = mockPrismaService.$executeRaw.mock.calls[0][0];
      const sql = Array.isArray(firstCall) ? firstCall.join(' ') : String(firstCall);

      expect(sql).toContain('WHERE vulnerability IS NOT NULL');
      expect(sql).not.toContain('bpbdRiskLevel');
    });

    it('should use COALESCE(bpbdRiskScore, 1) for roads without BPBD data', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([1]);

      await service.recalculateCombinedHazard();

      const firstCall = mockPrismaService.$executeRaw.mock.calls[0][0];
      const sql = Array.isArray(firstCall) ? firstCall.join(' ') : String(firstCall);

      expect(sql).toContain('COALESCE("bpbdRiskScore", 1)');
    });

    it('should recalculate safe_cost based on combinedHazard', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([1]);

      await service.recalculateCombinedHazard();

      const secondCall = mockPrismaService.$executeRaw.mock.calls[1][0];
      const sql = Array.isArray(secondCall) ? secondCall.join(' ') : String(secondCall);

      expect(sql).toContain('safe_cost');
      expect(sql).toContain('combinedHazard');
      expect(sql).toContain('WHERE geom IS NOT NULL');
    });

    it('should handle roads with vulnerability but no combinedHazard yet', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([1]);

      await service.recalculateCombinedHazard();

      const thirdCall = mockPrismaService.$executeRaw.mock.calls[2][0];
      const sql = Array.isArray(thirdCall) ? thirdCall.join(' ') : String(thirdCall);

      expect(sql).toContain('safe_cost');
      expect(sql).toContain('"combinedHazard" IS NULL');
      expect(sql).toContain('vulnerability IS NOT NULL');
    });

    it('should use 50% vulnerability + 50% BPBD formula', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([1]);

      await service.recalculateCombinedHazard();

      const firstCall = mockPrismaService.$executeRaw.mock.calls[0][0];
      const sql = Array.isArray(firstCall) ? firstCall.join(' ') : String(firstCall);

      expect(sql).toContain('* 0.5');
      const count = (sql.match(/\* 0\.5/g) || []).length;
      expect(count).toBe(2);
    });
  });

  describe('assignRiskToRoads', () => {
    it('should call recalculateCombinedHazard after assignment', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([5]);
      mockPrismaService.road.count.mockResolvedValue(10);
      const recalcSpy = jest.spyOn(service, 'recalculateCombinedHazard');

      await service.assignRiskToRoads();

      expect(recalcSpy).toHaveBeenCalled();
    });

    it('should set default LOW risk for roads without BPBD intersection', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([5]);
      mockPrismaService.road.count.mockResolvedValue(10);

      await service.assignRiskToRoads();

      const defaultCall = mockPrismaService.$executeRaw.mock.calls[1][0];
      const sql = Array.isArray(defaultCall) ? defaultCall.join(' ') : String(defaultCall);
      expect(sql).toContain('bpbdRiskLevel');
      expect(sql).toContain('LOW');
      expect(sql).toContain('WHERE "bpbdRiskLevel" IS NULL');
    });

    it('should return assignment statistics', async () => {
      mockPrismaService.$executeRaw.mockResolvedValue([5]);
      mockPrismaService.road.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10);

      const result = await service.assignRiskToRoads();

      expect(result.totalRoads).toBe(100);
      expect(result.assigned).toBe(60);
      expect(result.defaulted).toBe(40);
      expect(result.byRiskLevel).toEqual({ LOW: 30, MEDIUM: 20, HIGH: 10 });
    });
  });
});
