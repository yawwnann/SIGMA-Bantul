import { Test, TestingModule } from '@nestjs/testing';
import { EvacueeService } from './evacuee.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketService } from '../websocket/websocket.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EvacueeGender, EvacueeStatus } from '@prisma/client';

describe('EvacueeService', () => {
  let service: EvacueeService;
  let prisma: PrismaService;
  let websocketService: WebsocketService;

  const mockTx = {
    $queryRaw: jest.fn(),
    evacuee: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    evacuationLocation: {
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    evacuee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    evacuationLocation: {
      update: jest.fn(),
    },
  };

  const mockWebsocketService = {
    broadcastEvacueeCheckIn: jest.fn(),
    broadcastEvacueeCheckOut: jest.fn(),
    broadcastEvacuationCapacityUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvacueeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebsocketService, useValue: mockWebsocketService },
      ],
    }).compile();

    service = module.get<EvacueeService>(EvacueeService);
    prisma = module.get<PrismaService>(PrismaService);
    websocketService = module.get<WebsocketService>(WebsocketService);

    mockPrismaService.$transaction.mockImplementation(
      (callback: (tx: any) => Promise<any>, options?: any) => callback(mockTx),
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create - Race Condition Prevention', () => {
    const dto = {
      evacuationLocationId: 1,
      name: 'Test Evacuee',
      gender: EvacueeGender.MALE,
      age: 25,
      familySize: 3,
    };
    const userId = 1;

    it('should use Serializable isolation level', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 30 },
      ]);
      mockTx.evacuee.create.mockResolvedValue({
        id: 10,
        ...dto,
        registeredBy: userId,
        evacuationLocation: { id: 1, name: 'Location A' },
        registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
      });
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        name: 'Location A',
        capacity: 100,
        currentOccupancy: 33,
      });

      await service.create(dto, userId);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' },
      );
    });

    it('should lock row with FOR UPDATE on capacity check', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 30 },
      ]);
      mockTx.evacuee.create.mockResolvedValue({
        id: 10,
        ...dto,
        registeredBy: userId,
        evacuationLocation: { id: 1, name: 'Location A' },
        registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
      });
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        name: 'Location A',
        capacity: 100,
        currentOccupancy: 33,
      });

      await service.create(dto, userId);

      const callArg = mockTx.$queryRaw.mock.calls[0][0];
      expect(Array.isArray(callArg) ? callArg.join('') : callArg).toContain('FOR UPDATE');
    });

    it('should check capacity and create in same transaction', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 30 },
      ]);
      mockTx.evacuee.create.mockResolvedValue({
        id: 10,
        ...dto,
        registeredBy: userId,
        evacuationLocation: { id: 1, name: 'Location A' },
        registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
      });
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        name: 'Location A',
        capacity: 100,
        currentOccupancy: 33,
      });

      await service.create(dto, userId);

      expect(mockTx.evacuee.create).toHaveBeenCalledTimes(1);
      expect(mockTx.evacuationLocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: dto.evacuationLocationId },
          data: { currentOccupancy: { increment: dto.familySize } },
        }),
      );
    });

    it('should reject when capacity is insufficient', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 99 },
      ]);

      await expect(service.create({ ...dto, familySize: 5 }, userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTx.evacuee.create).not.toHaveBeenCalled();
      expect(mockTx.evacuationLocation.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when location missing', async () => {
      mockTx.$queryRaw.mockResolvedValue([]);

      await expect(service.create(dto, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTx.evacuee.create).not.toHaveBeenCalled();
    });

    it('should update occupancy with familySize increment', async () => {
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 30 },
      ]);
      mockTx.evacuee.create.mockResolvedValue({
        id: 10,
        ...dto,
        registeredBy: userId,
        evacuationLocation: { id: 1, name: 'Location A' },
        registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
      });
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        name: 'Location A',
        capacity: 100,
        currentOccupancy: 33,
      });

      await service.create(dto, userId);

      expect(mockTx.evacuationLocation.update).toHaveBeenCalledWith({
        where: { id: dto.evacuationLocationId },
        data: { currentOccupancy: { increment: dto.familySize } },
      });
    });

    it('should broadcast WebSocket events after successful creation', async () => {
      const evacueeResult = {
        id: 10,
        name: 'Test Evacuee',
        registeredBy: userId,
        evacuationLocation: { id: 1, name: 'Location A' },
        registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
      };
      const locationResult = {
        id: 1,
        name: 'Location A',
        capacity: 100,
        currentOccupancy: 33,
      };

      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 30 },
      ]);
      mockTx.evacuee.create.mockResolvedValue(evacueeResult);
      mockTx.evacuationLocation.update.mockResolvedValue(locationResult);

      await service.create(dto, userId);

      expect(mockWebsocketService.broadcastEvacueeCheckIn).toHaveBeenCalledWith({
        evacueeId: 10,
        name: 'Test Evacuee',
        evacuationLocationId: 1,
        evacuationLocationName: 'Location A',
        familySize: 3,
      });
      expect(
        mockWebsocketService.broadcastEvacuationCapacityUpdate,
      ).toHaveBeenCalledWith({
        id: 1,
        name: 'Location A',
        currentOccupancy: 33,
        availableCapacity: 100 - 33,
        totalCapacity: 100,
      });
    });
  });

  describe('update - Race Condition Prevention', () => {
    const existingEvacuee = {
      id: 5,
      evacuationLocationId: 1,
      familySize: 2,
      status: EvacueeStatus.ACTIVE,
      name: 'Existing',
      gender: EvacueeGender.MALE,
      age: 30,
      evacuationLocation: { id: 1, name: 'Location A' },
      registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
    };

    it('should use Serializable isolation level', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue(existingEvacuee);
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 30 },
      ]);
      mockTx.evacuee.update.mockResolvedValue(existingEvacuee);
      mockTx.evacuationLocation.update.mockResolvedValue({ id: 1, currentOccupancy: 31 });

      await service.update(5, { familySize: 3 });

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' },
      );
    });

    it('should lock with FOR UPDATE when increasing family size', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue(existingEvacuee);
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 30 },
      ]);
      mockTx.evacuee.update.mockResolvedValue(existingEvacuee);
      mockTx.evacuationLocation.update.mockResolvedValue({ id: 1, currentOccupancy: 31 });

      await service.update(5, { familySize: 3 });

      const callArg = mockTx.$queryRaw.mock.calls[0][0];
      expect(Array.isArray(callArg) ? callArg.join('') : callArg).toContain('FOR UPDATE');
    });

    it('should reject if capacity exceeded when increasing family size', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue({
        ...existingEvacuee,
        familySize: 1,
      });
      mockTx.$queryRaw.mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 100, currentOccupancy: 98 },
      ]);

      await expect(service.update(5, { familySize: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should decrement occupancy when status changes to RETURNED_HOME', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue(existingEvacuee);
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        name: 'Location A',
        capacity: 100,
        currentOccupancy: 28,
      });
      mockTx.evacuee.update.mockResolvedValue({
        ...existingEvacuee,
        status: EvacueeStatus.RETURNED_HOME,
        checkOutDate: expect.any(String),
      });

      await service.update(5, { status: EvacueeStatus.RETURNED_HOME });

      expect(mockTx.evacuationLocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { currentOccupancy: { decrement: 2 } },
        }),
      );
    });
  });

  describe('delete - Race Condition Prevention', () => {
    const existingEvacuee = {
      id: 5,
      evacuationLocationId: 1,
      familySize: 2,
      status: EvacueeStatus.ACTIVE,
      name: 'Existing',
      gender: EvacueeGender.MALE,
      age: 30,
      evacuationLocation: { id: 1, name: 'Location A' },
      registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
    };

    it('should use Serializable isolation level when status is ACTIVE', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue(existingEvacuee);
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        capacity: 100,
        currentOccupancy: 28,
      });
      mockTx.evacuee.delete.mockResolvedValue(existingEvacuee);

      await service.delete(5);

      expect(mockPrismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' },
      );
    });

    it('should decrement occupancy and delete in one transaction', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue(existingEvacuee);
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        capacity: 100,
        currentOccupancy: 28,
      });
      mockTx.evacuee.delete.mockResolvedValue(existingEvacuee);

      await service.delete(5);

      expect(mockTx.evacuationLocation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currentOccupancy: { decrement: 2 } },
      });
      expect(mockTx.evacuee.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it('should not use transaction when evacuee is already checked out', async () => {
      const checkedOut = { ...existingEvacuee, status: EvacueeStatus.RETURNED_HOME };
      mockPrismaService.evacuee.findUnique.mockResolvedValue(checkedOut);
      mockPrismaService.evacuee.delete.mockResolvedValue(checkedOut);

      await service.delete(5);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockPrismaService.evacuee.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });

    it('should broadcast WebSocket events after successful delete', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue(existingEvacuee);
      const updatedLoc = {
        id: 1,
        name: 'Location A',
        capacity: 100,
        currentOccupancy: 28,
      };
      mockTx.evacuationLocation.update.mockResolvedValue(updatedLoc);
      mockTx.evacuee.delete.mockResolvedValue(existingEvacuee);

      await service.delete(5);

      expect(mockWebsocketService.broadcastEvacueeCheckOut).toHaveBeenCalledWith({
        evacueeId: 5,
        name: 'Existing',
        evacuationLocationId: 1,
        evacuationLocationName: 'Location A',
        familySize: 2,
      });
      expect(
        mockWebsocketService.broadcastEvacuationCapacityUpdate,
      ).toHaveBeenCalledWith({
        id: 1,
        name: 'Location A',
        currentOccupancy: 28,
        availableCapacity: 100 - 28,
        totalCapacity: 100,
      });
    });
  });

  describe('Concurrent Request Simulation', () => {
    it('should prevent overbooking under concurrent create requests', async () => {
      const dto = {
        evacuationLocationId: 1,
        name: 'Test',
        gender: EvacueeGender.MALE,
        age: 25,
        familySize: 60,
      };
      const userId = 1;

      let callCount = 0;
      mockTx.$queryRaw.mockImplementation(async () => {
        const current = callCount;
        callCount++;
        if (current === 0) {
          return [{ id: 1, capacity: 100, currentOccupancy: 50 }];
        }
        return [{ id: 1, capacity: 100, currentOccupancy: 50 }];
      });

      mockTx.evacuee.create.mockResolvedValue({
        id: 10,
        ...dto,
        registeredBy: userId,
        evacuationLocation: { id: 1, name: 'A' },
        registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
      });
      mockTx.evacuationLocation.update.mockResolvedValue({
        id: 1,
        capacity: 100,
        currentOccupancy: 110,
      });

      await expect(service.create(dto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should atomically check and update capacity for create', async () => {
      const dto = {
        evacuationLocationId: 1,
        name: 'Test',
        gender: EvacueeGender.MALE,
        age: 25,
        familySize: 3,
      };
      const userId = 1;

      const queryRawSpy = jest.fn().mockResolvedValue([
        { id: 1, name: 'Location A', capacity: 10, currentOccupancy: 5 },
      ]);
      const createSpy = jest.fn().mockResolvedValue({
        id: 10,
        ...dto,
        registeredBy: userId,
        evacuationLocation: { id: 1, name: 'Location A' },
        registeredByUser: { id: 1, name: 'Admin', email: 'a@b.com' },
      });
      const updateSpy = jest.fn().mockResolvedValue({
        id: 1,
        name: 'Location A',
        capacity: 10,
        currentOccupancy: 8,
      });

      mockPrismaService.$transaction.mockImplementation(
        (callback: (tx: any) => Promise<any>, _options?: any) =>
          callback({
            $queryRaw: queryRawSpy,
            evacuee: { create: createSpy, update: jest.fn(), delete: jest.fn() },
            evacuationLocation: { update: updateSpy },
          }),
      );

      await service.create(dto, userId);

      expect(queryRawSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currentOccupancy: { increment: 3 } },
      });
    });
  });

  describe('findAll / findOne', () => {
    it('should return all evacuees', async () => {
      const result = [{ id: 1, name: 'Evacuee A' }];
      mockPrismaService.evacuee.findMany.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
    });

    it('should filter by evacuationLocationId', async () => {
      const result = [{ id: 1, evacuationLocationId: 2 }];
      mockPrismaService.evacuee.findMany.mockResolvedValue(result);

      await service.findAll(2);
      expect(mockPrismaService.evacuee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ evacuationLocationId: 2 }),
        }),
      );
    });

    it('should throw NotFoundException if evacuee not found', async () => {
      mockPrismaService.evacuee.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
