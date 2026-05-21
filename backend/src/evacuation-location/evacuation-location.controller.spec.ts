import { Test, TestingModule } from '@nestjs/testing';
import { EvacuationLocationController } from './evacuation-location.controller';
import { EvacuationLocationService } from './evacuation-location.service';
import { EvacuationLocationCategory, EvacuationLocationCondition, EvacuationLocationStatus } from '@prisma/client';

describe('EvacuationLocationController', () => {
  let controller: EvacuationLocationController;
  let service: EvacuationLocationService;

  const mockService = {
    findAll: jest.fn(),
    getNearby: jest.fn(),
    getStatistics: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateOccupancy: jest.fn(),
    delete: jest.fn(),
    assignOfficer: jest.fn(),
    unassignOfficer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvacuationLocationController],
      providers: [
        {
          provide: EvacuationLocationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EvacuationLocationController>(EvacuationLocationController);
    service = module.get<EvacuationLocationService>(EvacuationLocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all evacuation locations', async () => {
      const result = [{ id: 1, name: 'Test' }];
      mockService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual(result);
      expect(mockService.findAll).toHaveBeenCalledWith({ condition: undefined, category: undefined });
    });
  });

  describe('getNearby', () => {
    it('should return nearby evacuation locations', async () => {
      const result = [{ id: 1, distanceKm: 2 }];
      mockService.getNearby.mockResolvedValue(result);

      expect(await controller.getNearby('-7.5', '110.5', '5', '10')).toEqual(result);
      expect(mockService.getNearby).toHaveBeenCalledWith(-7.5, 110.5, 5, 10);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const result = { total: 5 };
      mockService.getStatistics.mockResolvedValue(result);

      expect(await controller.getStatistics()).toEqual(result);
      expect(mockService.getStatistics).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create an evacuation location', async () => {
      const dto = { name: 'Test', category: EvacuationLocationCategory.SCHOOL, capacity: 100, geometry: { type: 'Point', coordinates: [0, 0] }, condition: EvacuationLocationCondition.GOOD };
      const result = { id: 1, ...dto };
      mockService.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update an evacuation location', async () => {
      const dto = { name: 'Test', category: EvacuationLocationCategory.SCHOOL, capacity: 100, geometry: { type: 'Point', coordinates: [0, 0] }, condition: EvacuationLocationCondition.GOOD };
      const result = { id: 1, ...dto };
      mockService.update.mockResolvedValue(result);

      expect(await controller.update(1, dto)).toEqual(result);
      expect(mockService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('delete', () => {
    it('should delete an evacuation location', async () => {
      mockService.delete.mockResolvedValue({ id: 1 });
      expect(await controller.delete(1)).toEqual({ id: 1 });
      expect(mockService.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('updateOccupancy', () => {
    it('should update occupancy', async () => {
      mockService.updateOccupancy.mockResolvedValue({ id: 1, currentOccupancy: 50 });
      expect(await controller.updateOccupancy(1, 50)).toEqual({ id: 1, currentOccupancy: 50 });
      expect(mockService.updateOccupancy).toHaveBeenCalledWith(1, 50);
    });
  });
});
