import { Test, TestingModule } from '@nestjs/testing';
import { FrequencyAnalysisService } from './frequency-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('path');

const mockPrismaService = {
  earthquake: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('FrequencyAnalysisService', () => {
  let service: FrequencyAnalysisService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Setup Mock GeoJSON Data for fs.readFileSync
    const mockGeoJson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { NAMOBJ: 'Desa A' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [110.2, -7.8],
                [110.3, -7.8],
                [110.3, -7.9],
                [110.2, -7.9],
                [110.2, -7.8],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { NAMOBJ: 'Desa B' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [110.3, -7.8],
                [110.4, -7.8],
                [110.4, -7.9],
                [110.3, -7.9],
                [110.3, -7.8],
              ],
            ],
          },
        },
      ],
    };

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockGeoJson));
    (path.join as jest.Mock).mockReturnValue('mock/path/data_desa.geojson');
    
    // Clear mock calls
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrequencyAnalysisService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FrequencyAnalysisService>(FrequencyAnalysisService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateFrequency', () => {
    it('should correctly classify and count earthquakes in villages', async () => {
      // Mock earthquakes that fall within Desa A and Desa B
      const mockEarthquakes = [
        { lon: 110.25, lat: -7.85 }, // Inside Desa A
        { lon: 110.26, lat: -7.86 }, // Inside Desa A
        { lon: 110.27, lat: -7.87 }, // Inside Desa A
        { lon: 110.35, lat: -7.85 }, // Inside Desa B
      ];

      (prisma.earthquake.findMany as jest.Mock).mockResolvedValue(mockEarthquakes);
      (prisma.earthquake.count as jest.Mock).mockResolvedValue(4);

      const queryDto = {
        start_date: '2023-01-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await service.calculateFrequency(queryDto);

      // Verify Prisma queries
      expect(prisma.earthquake.findMany).toHaveBeenCalled();
      expect(prisma.earthquake.count).toHaveBeenCalled();

      // Check basic structure
      expect(result.metadata.total_earthquakes).toBe(4);
      expect(result.metadata.grid_size).toBe('village');
      
      // Check grid results
      const grids = result.grids;
      expect(grids.length).toBe(2);

      const desaA = grids.find((g: any) => g.grid_id === 'Desa A');
      const desaB = grids.find((g: any) => g.grid_id === 'Desa B');

      expect(desaA).toBeDefined();
      expect(desaA.count).toBe(3); // 3 earthquakes in Desa A
      expect(desaA.level).toBe('medium'); // Threshold: > 2 and <= 5 is medium

      expect(desaB).toBeDefined();
      expect(desaB.count).toBe(1); // 1 earthquake in Desa B
      expect(desaB.level).toBe('low'); // Threshold: <= 2 is low
    });
    
    it('should return 0 counts for villages with no earthquakes', async () => {
      // Mock no matching earthquakes
      (prisma.earthquake.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.earthquake.count as jest.Mock).mockResolvedValue(0);

      const queryDto = {
        start_date: '2023-01-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await service.calculateFrequency(queryDto);

      expect(result.metadata.total_earthquakes).toBe(0);
      
      const grids = result.grids;
      const desaA = grids.find((g: any) => g.grid_id === 'Desa A');
      
      expect(desaA.count).toBe(0);
      expect(desaA.level).toBe('low');
    });

    it('should handle errors if geojson is missing', async () => {
      // Force geojson to be null to test error handling
      (service as any).villageGeoJson = null;

      const queryDto = {
        start_date: '2023-01-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      await expect(service.calculateFrequency(queryDto)).rejects.toThrow(
        'Village GeoJSON data is not loaded.'
      );
    });
  });

  describe('classifyFrequency', () => {
    it('should return correct levels based on thresholds', () => {
      expect(service.classifyFrequency(1)).toBe('low');
      expect(service.classifyFrequency(2)).toBe('low');
      expect(service.classifyFrequency(3)).toBe('medium');
      expect(service.classifyFrequency(5)).toBe('medium');
      expect(service.classifyFrequency(6)).toBe('high');
      expect(service.classifyFrequency(100)).toBe('high');
    });
  });
});
