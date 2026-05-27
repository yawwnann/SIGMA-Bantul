import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BantulBoundaryService {
  private readonly logger = new Logger(BantulBoundaryService.name);
  private polygonCoords: number[][][][] | null = null;
  private readonly BOUNDARY_FILE = 'Data/GeoJSon/34.02_Bantul.geojson';
  private readonly CACHE_KEY = 'bantul:boundary';
  private readonly CACHE_TTL = 86400; // 24 hours

  constructor(private redisService: RedisService) {}

  /**
   * Load boundary from cache (Redis) or file
   * Cached for 24 hours since boundary doesn't change
   */
  async getBoundary(): Promise<number[][][][]> {
    if (this.polygonCoords) {
      return this.polygonCoords;
    }

    // Try Redis cache first
    try {
      const cached = await this.redisService.getJson<number[][][][]>(this.CACHE_KEY);
      if (cached) {
        this.logger.log('Bantul boundary loaded from Redis cache');
        this.polygonCoords = cached;
        return cached;
      }
    } catch (error) {
      this.logger.warn('Failed to get boundary from Redis, trying file');
    }

    // Load from GeoJSON file
    const filePath = path.resolve(process.cwd(), this.BOUNDARY_FILE);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const geojson = JSON.parse(fileContent);
      const coords = geojson.features?.[0]?.geometry?.coordinates;

      if (coords) {
        // Cache to Redis for 24 hours
        try {
          await this.redisService.setex(
            this.CACHE_KEY,
            this.CACHE_TTL,
            JSON.stringify(coords),
          );
        } catch (cacheError) {
          this.logger.warn('Failed to cache boundary to Redis');
        }

        this.polygonCoords = coords;
        this.logger.log(`Bantul boundary loaded from file: ${filePath}`);
        return coords;
      }

      throw new Error('No coordinates found in Bantul boundary GeoJSON');
    } catch (error) {
      this.logger.error('Failed to load Bantul boundary', error);
      throw new Error('Failed to load Bantul boundary GeoJSON');
    }
  }

  /**
   * Ray-casting point-in-polygon algorithm
   * Checks if a point is inside a polygon
   */
  private pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      // Check if point is between y-coordinates and crosses the edge
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Check if point is inside any polygon (supports MultiPolygon)
   */
  private checkMultiPolygon(lat: number, lng: number, multiPolygonCoords: number[][][][]): boolean {
    for (const polygon of multiPolygonCoords) {
      const outerRing = polygon[0];
      if (outerRing && this.pointInPolygon(lat, lng, outerRing)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if coordinates are within Bantul boundary
   */
  async isWithinBantul(lat: number, lng: number): Promise<boolean> {
    try {
      const coords = await this.getBoundary();
      return this.checkMultiPolygon(lat, lng, coords);
    } catch (error) {
      // If boundary loading fails, allow the request (fail-open)
      // This prevents blocking all traffic if boundary file is missing
      this.logger.warn(`Boundary check failed for (${lat}, ${lng}), allowing request: ${error}`);
      return true;
    }
  }

  /**
   * Validate coordinates and throw BadRequestException if outside Bantul
   */
  async validateOrThrow(lat: number, lng: number): Promise<void> {
    const isInside = await this.isWithinBantul(lat, lng);
    if (!isInside) {
      throw new BadRequestException(
        `Koordinat (${lat.toFixed(6)}, ${lng.toFixed(6)}) berada di luar wilayah Kabupaten Bantul. Sistem hanya mendukung evakuasi di wilayah Bantul.`,
      );
    }
  }

  /**
   * Validate coordinates for route (both start and end)
   */
  async validateRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<void> {
    await this.validateOrThrow(startLat, startLng);
    await this.validateOrThrow(endLat, endLng);
  }

  /**
   * Clear boundary cache (useful for testing or cache refresh)
   */
  async clearCache(): Promise<void> {
    this.polygonCoords = null;
    await this.redisService.del(this.CACHE_KEY);
    this.logger.log('Bantul boundary cache cleared');
  }
}
