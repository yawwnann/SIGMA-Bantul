import { Test, TestingModule } from '@nestjs/testing';
import { EvacuationLocationService } from './evacuation-location.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  EvacuationLocationCategory,
  EvacuationLocationCondition,
  UserRole,
  EvacuationLocationStatus,
} from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { WebsocketService } from '../websocket/websocket.service';

describe('EvacuationLocationService', () => {
  let service: EvacuationLocationService;
  let prisma: PrismaService;
  
  const mockRedisService = {
    getJson: jest.fn(),
    setJson: jest.fn(),
  };

  const mockWebsocketService = {
    broadcastEvacuationCapacityUpdate: jest.fn(),
  };

  const mockPrismaService = {
    evacuationLocation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvacuationLocationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: WebsocketService,
          useValue: mockWebsocketService,
        },
      ],
    }).compile();

    service = module.get<EvacuationLocationService>(EvacuationLocationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an evacuation location', async () => {
      const dto = {
        name: 'Test Location',
        category: EvacuationLocationCategory.SCHOOL,
        capacity: 100,
        geometry: { type: 'Point', coordinates: [0, 0] },
        condition: EvacuationLocationCondition.GOOD,
      };

      const result = { id: 1, ...dto, status: EvacuationLocationStatus.ACTIVE };
      mockPrismaService.evacuationLocation.create.mockResolvedValue(result);

      expect(await service.create(dto)).toEqual(result);
      expect(mockPrismaService.evacuationLocation.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('findAll', () => {
    it('should return all evacuation locations', async () => {
      const result = [{ id: 1, name: 'Test Location' }];
      mockPrismaService.evacuationLocation.findMany.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockPrismaService.evacuationLocation.findMany).toHaveBeenCalled();
    });

    it('should return filtered evacuation locations', async () => {
      const result = [
        {
          id: 1,
          name: 'Test Location',
          condition: EvacuationLocationCondition.GOOD,
        },
      ];
      mockPrismaService.evacuationLocation.findMany.mockResolvedValue(result);

      expect(
        await service.findAll({ condition: EvacuationLocationCondition.GOOD }),
      ).toEqual(result);
      expect(
        mockPrismaService.evacuationLocation.findMany,
      ).toHaveBeenCalledWith({
        where: { condition: EvacuationLocationCondition.GOOD },
        include: { officer: { select: { id: true, name: true, email: true } } },
      });
    });
  });

  describe('findById', () => {
    it('should return an evacuation location if found', async () => {
      const result = { id: 1, name: 'Test Location' };
      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue(result);

      expect(await service.findById(1)).toEqual(result);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an evacuation location', async () => {
      const dto = {
        name: 'Updated Location',
        category: EvacuationLocationCategory.SCHOOL,
        condition: EvacuationLocationCondition.GOOD,
        capacity: 200,
        geometry: { type: 'Point', coordinates: [0, 0] },
      };
      const existing = { id: 1, name: 'Test Location' };
      const updated = { id: 1, ...dto };

      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue(
        existing,
      );
      mockPrismaService.evacuationLocation.update.mockResolvedValue(updated);

      expect(await service.update(1, dto)).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should delete an evacuation location', async () => {
      const existing = { id: 1, name: 'Test Location' };
      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue(
        existing,
      );
      mockPrismaService.evacuationLocation.delete.mockResolvedValue(existing);

      expect(await service.delete(1)).toEqual(existing);
    });
  });

  describe('assignOfficer', () => {
    it('should assign an officer successfully', async () => {
      const existing = { id: 1, name: 'Test Location' };
      const officer = { id: 2, role: UserRole.EVACUATION_LOCATION_OFFICER };
      const updated = { ...existing, officerId: 2 };

      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue(
        existing,
      );
      mockPrismaService.user.findFirst.mockResolvedValue(officer);
      mockPrismaService.evacuationLocation.update.mockResolvedValue(updated);

      expect(await service.assignOfficer(1, 2)).toEqual(updated);
    });

    it('should throw BadRequestException if officer invalid', async () => {
      const existing = { id: 1, name: 'Test Location' };

      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue(
        existing,
      );
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.assignOfficer(1, 2)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      mockPrismaService.evacuationLocation.count.mockResolvedValue(5);
      mockPrismaService.evacuationLocation.groupBy.mockResolvedValue([
        { condition: 'GOOD', _count: 3 },
        { condition: 'DAMAGED', _count: 2 },
      ]);
      mockPrismaService.evacuationLocation.aggregate.mockResolvedValue({
        _sum: { capacity: 1000 },
      });

      const stats = await service.getStatistics();
      expect(stats.total).toBe(5);
      expect(stats.totalCapacity).toBe(1000);
      expect(stats.byCondition.length).toBe(2);
    });
  });

  describe('Navigation Tracking', () => {
    it('should calculate inbound count and clean up old entries', async () => {
      const now = Date.now();
      mockRedisService.getJson.mockResolvedValue([
        { deviceId: '1', timestamp: now },
        { deviceId: '2', timestamp: now - 50 * 60 * 1000 }, // expired
      ]);

      const count = await service.getInboundCount(1);
      expect(count).toBe(1);
      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'evacuation-location:1:inbound',
        [{ deviceId: '1', timestamp: now }]
      );
    });

    it('should allow startNavigation if capacity is available', async () => {
      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue({
        id: 1, capacity: 10, currentOccupancy: 8
      });
      mockRedisService.getJson.mockResolvedValue([{ deviceId: '1', timestamp: Date.now() }]);

      const result = await service.startNavigation(1, '2');
      expect(result.success).toBe(true);
      expect(result.inboundCount).toBe(2);
    });

    it('should throw if startNavigation exceeds capacity', async () => {
      mockPrismaService.evacuationLocation.findUnique.mockResolvedValue({
        id: 1, capacity: 10, currentOccupancy: 8
      });
      mockRedisService.getJson.mockResolvedValue([
        { deviceId: '1', timestamp: Date.now() },
        { deviceId: '2', timestamp: Date.now() },
      ]);

      await expect(service.startNavigation(1, '3')).rejects.toThrow(BadRequestException);
    });

    it('should remove deviceId on stopNavigation', async () => {
      const now = Date.now();
      mockRedisService.getJson.mockResolvedValue([
        { deviceId: '1', timestamp: now },
        { deviceId: '2', timestamp: now },
      ]);

      await service.stopNavigation(1, '1');
      expect(mockRedisService.setJson).toHaveBeenCalledWith(
        'evacuation-location:1:inbound',
        [{ deviceId: '2', timestamp: now }]
      );
    });
  });
});
