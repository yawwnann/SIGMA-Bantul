import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BantulBoundaryService } from './bantul-boundary.service';
import { RedisService } from '../../redis/redis.service';

describe('BantulBoundaryService', () => {
  let service: BantulBoundaryService;
  let redisService: RedisService;

  const mockRedisService = {
    getJson: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BantulBoundaryService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BantulBoundaryService>(BantulBoundaryService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Simple polygon data for testing ──────────────────────────
  // A small square polygon around Bantul center (approximately)
  // Coordinates in [lng, lat] order (GeoJSON convention)
  const mockSquareMultiPolygon: number[][][][] = [
    [
      // Outer ring (counter-clockwise square)
      [
        [110.30, -7.85],
        [110.37, -7.85],
        [110.37, -7.92],
        [110.30, -7.92],
        [110.30, -7.85],
      ],
    ],
  ];

  const mockBantulCenterMultiPolygon: number[][][][] = [
    [
      // A more realistic polygon encompassing Bantul center
      [
        [110.20, -7.80],
        [110.45, -7.80],
        [110.45, -8.10],
        [110.20, -8.10],
        [110.20, -7.80],
      ],
    ],
  ];

  describe('pointInPolygon (private)', () => {
    it('should return true for point inside a square polygon', () => {
      const polygon = mockSquareMultiPolygon[0][0];
      const result = (service as any).pointInPolygon(-7.88, 110.33, polygon);
      expect(result).toBe(true);
    });

    it('should return false for point outside a square polygon (west)', () => {
      const polygon = mockSquareMultiPolygon[0][0];
      const result = (service as any).pointInPolygon(-7.88, 110.20, polygon);
      expect(result).toBe(false);
    });

    it('should return false for point outside a square polygon (north)', () => {
      const polygon = mockSquareMultiPolygon[0][0];
      const result = (service as any).pointInPolygon(-7.80, 110.33, polygon);
      expect(result).toBe(false);
    });

    it('should return false for point clearly outside to the east', () => {
      const polygon = mockSquareMultiPolygon[0][0];
      const result = (service as any).pointInPolygon(-7.88, 110.40, polygon);
      expect(result).toBe(false);
    });

    it('should handle large realistic polygon', () => {
      const polygon = mockBantulCenterMultiPolygon[0][0];
      expect((service as any).pointInPolygon(-7.886, 110.334, polygon)).toBe(true);
      expect((service as any).pointInPolygon(-7.95, 110.40, polygon)).toBe(true);
      expect((service as any).pointInPolygon(-7.90, 110.30, polygon)).toBe(true);
      expect((service as any).pointInPolygon(-7.75, 110.33, polygon)).toBe(false);
      expect((service as any).pointInPolygon(-7.90, 110.50, polygon)).toBe(false);
    });
  });

  describe('checkMultiPolygon (private)', () => {
    it('should return true for point inside the only polygon', () => {
      const result = (service as any).checkMultiPolygon(-7.88, 110.33, mockSquareMultiPolygon);
      expect(result).toBe(true);
    });

    it('should return false for point outside all polygons', () => {
      const result = (service as any).checkMultiPolygon(-7.80, 110.10, mockSquareMultiPolygon);
      expect(result).toBe(false);
    });

    it('should return true if point is inside any polygon in a MultiPolygon', () => {
      const multiPolygon: number[][][][] = [
        [
          [
            [110.10, -7.80],
            [110.20, -7.80],
            [110.20, -7.90],
            [110.10, -7.90],
            [110.10, -7.80],
          ],
        ],
        ...mockSquareMultiPolygon,
      ];
      expect((service as any).checkMultiPolygon(-7.88, 110.33, multiPolygon)).toBe(true);
      expect((service as any).checkMultiPolygon(-7.85, 110.15, multiPolygon)).toBe(true);
      expect((service as any).checkMultiPolygon(-7.99, 110.15, multiPolygon)).toBe(false);
    });

    it('should return false for empty MultiPolygon', () => {
      const result = (service as any).checkMultiPolygon(-7.88, 110.33, []);
      expect(result).toBe(false);
    });
  });

  describe('getBoundary', () => {
    const mockCoords: number[][][][] = [
      [
        [
          [110.30, -7.85],
          [110.37, -7.85],
          [110.37, -7.92],
          [110.30, -7.92],
          [110.30, -7.85],
        ],
      ],
    ];

    it('should return from memory cache when available', async () => {
      (service as any).polygonCoords = mockCoords;
      const result = await service.getBoundary();
      expect(result).toEqual(mockCoords);
      expect(mockRedisService.getJson).not.toHaveBeenCalled();
    });

    it('should return from Redis cache when memory cache is empty', async () => {
      mockRedisService.getJson.mockResolvedValue(mockCoords);
      (service as any).polygonCoords = null;

      const result = await service.getBoundary();

      expect(result).toEqual(mockCoords);
      expect(mockRedisService.getJson).toHaveBeenCalledWith('bantul:boundary');
    });

    it('should load from file when Redis cache misses', async () => {
      mockRedisService.getJson.mockResolvedValue(null);
      (service as any).polygonCoords = null;

      const fs = require('fs');
      const path = require('path');
      const mockFileContent = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'MultiPolygon',
              coordinates: mockCoords,
            },
          },
        ],
      });

      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);

      const result = await service.getBoundary();

      expect(result).toEqual(mockCoords);
      expect(readFileSyncSpy).toHaveBeenCalled();
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        'bantul:boundary',
        86400,
        JSON.stringify(mockCoords),
      );

      readFileSyncSpy.mockRestore();
    });

    it('should throw error when GeoJSON file is missing', async () => {
      mockRedisService.getJson.mockResolvedValue(null);
      (service as any).polygonCoords = null;

      const fs = require('fs');
      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: file not found');
      });

      await expect(service.getBoundary()).rejects.toThrow('Failed to load Bantul boundary GeoJSON');
      readFileSyncSpy.mockRestore();
    });

    it('should cache loaded data to Redis', async () => {
      mockRedisService.getJson.mockResolvedValue(null);
      (service as any).polygonCoords = null;

      const fs = require('fs');
      const mockFileContent = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'MultiPolygon',
              coordinates: mockCoords,
            },
          },
        ],
      });

      const readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(mockFileContent);
      mockRedisService.setex.mockResolvedValue(undefined);

      await service.getBoundary();

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        'bantul:boundary',
        expect.any(Number),
        expect.any(String),
      );

      readFileSyncSpy.mockRestore();
    });
  });

  describe('isWithinBantul', () => {
    beforeEach(() => {
      mockRedisService.getJson.mockResolvedValue(mockBantulCenterMultiPolygon);
      (service as any).polygonCoords = null;
    });

    it('should return true for point inside Bantul (center)', async () => {
      const result = await service.isWithinBantul(-7.886, 110.334);
      expect(result).toBe(true);
    });

    it('should return true for point inside Bantul (south)', async () => {
      const result = await service.isWithinBantul(-7.95, 110.35);
      expect(result).toBe(true);
    });

    it('should return false for point far outside Bantul', async () => {
      const result = await service.isWithinBantul(-7.75, 110.10);
      expect(result).toBe(false);
    });

    it('should return false for point east outside Bantul', async () => {
      const result = await service.isWithinBantul(-7.90, 110.55);
      expect(result).toBe(false);
    });

    it('should return true (fail-open) when boundary loading fails', async () => {
      jest.spyOn(service as any, 'getBoundary').mockRejectedValue(new Error('Failed to load'));
      const result = await service.isWithinBantul(-7.886, 110.334);
      expect(result).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    beforeEach(() => {
      mockRedisService.getJson.mockResolvedValue(mockBantulCenterMultiPolygon);
      (service as any).polygonCoords = null;
    });

    it('should not throw for point inside Bantul', async () => {
      await expect(service.validateOrThrow(-7.886, 110.334)).resolves.toBeUndefined();
    });

    it('should throw BadRequestException for point outside Bantul', async () => {
      await expect(service.validateOrThrow(-7.75, 110.10)).rejects.toThrow(BadRequestException);
    });

    it('should include coordinates in error message', async () => {
      try {
        await service.validateOrThrow(-7.75, 110.10);
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('-7.750000');
        expect(error.message).toContain('110.100000');
        expect(error.message).toContain('Bantul');
      }
    });

    it('should throw for each coordinate independently', async () => {
      const insideLat = -7.886;
      const insideLng = 110.334;
      const outsideLat = -7.75;
      const outsideLng = 110.10;

      await expect(service.validateOrThrow(insideLat, insideLng)).resolves.toBeUndefined();
      await expect(service.validateOrThrow(outsideLat, insideLng)).rejects.toThrow(BadRequestException);
      await expect(service.validateOrThrow(insideLat, outsideLng)).rejects.toThrow(BadRequestException);
      await expect(service.validateOrThrow(outsideLat, outsideLng)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateRoute', () => {
    beforeEach(() => {
      mockRedisService.getJson.mockResolvedValue(mockBantulCenterMultiPolygon);
      (service as any).polygonCoords = null;
    });

    it('should not throw when both start and end are inside Bantul', async () => {
      await expect(
        service.validateRoute(-7.886, 110.334, -7.95, 110.35),
      ).resolves.toBeUndefined();
    });

    it('should throw when start is outside Bantul', async () => {
      await expect(
        service.validateRoute(-7.75, 110.10, -7.886, 110.334),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when end is outside Bantul', async () => {
      await expect(
        service.validateRoute(-7.886, 110.334, -7.75, 110.10),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when both start and end are outside Bantul', async () => {
      await expect(
        service.validateRoute(-7.75, 110.10, -7.80, 110.55),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clearCache', () => {
    it('should clear in-memory cache and Redis cache', async () => {
      (service as any).polygonCoords = mockBantulCenterMultiPolygon;
      mockRedisService.del.mockResolvedValue(undefined);

      await service.clearCache();

      expect((service as any).polygonCoords).toBeNull();
      expect(mockRedisService.del).toHaveBeenCalledWith('bantul:boundary');
    });
  });
});
