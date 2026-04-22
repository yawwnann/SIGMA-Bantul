import { Injectable, Logger } from '@nestjs/common';
import { FrequencyAnalysisService } from './frequency-analysis.service';
import { FrequencyQueryDto } from './dto/frequency-query.dto';
import { RedisService } from '../redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EarthquakeAnalysisService {
  private readonly logger = new Logger(EarthquakeAnalysisService.name);
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    private frequencyAnalysisService: FrequencyAnalysisService,
    private redisService: RedisService,
  ) {}

  /**
   * Get frequency analysis with caching
   */
  async getFrequencyAnalysis(query: FrequencyQueryDto) {
    // Generate cache key
    const cacheKey = this.generateCacheKey(query);

    // Try to get from cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.log(`Cache miss for key: ${cacheKey}, calculating...`);

    // Calculate frequency
    const result =
      await this.frequencyAnalysisService.calculateFrequency(query);

    // Store in cache
    await this.redisService.setex(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(result),
    );

    return result;
  }

  /**
   * Get analysis statistics
   */
  async getStatistics(startDate: string, endDate: string) {
    const cacheKey = `analysis:statistics:${startDate}:${endDate}`;

    // Try cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate
    const result = await this.frequencyAnalysisService.getStatistics(
      startDate,
      endDate,
    );

    // Cache
    await this.redisService.setex(
      cacheKey,
      this.CACHE_TTL,
      JSON.stringify(result),
    );

    return result;
  }

  /**
   * Get Bantul boundary GeoJSON
   */
  async getBantulBoundary() {
    const cacheKey = 'analysis:bantul-boundary';

    // Try cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.log('Bantul boundary from cache');
      return JSON.parse(cached);
    }

    // Read from file
    const filePath = path.join(
      process.cwd(),
      'Data',
      'GeoJSon',
      '34.02_Bantul.geojson',
    );

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const geojson = JSON.parse(fileContent);

      // Cache for 24 hours (boundary doesn't change)
      await this.redisService.setex(cacheKey, 86400, JSON.stringify(geojson));

      this.logger.log('Bantul boundary loaded from file');
      return geojson;
    } catch (error) {
      this.logger.error('Failed to load Bantul boundary', error);
      throw new Error('Failed to load Bantul boundary');
    }
  }

  /**
   * Clear analysis cache
   */
  async clearCache() {
    const pattern = 'analysis:frequency:*';
    await this.redisService.deletePattern(pattern);
    this.logger.log('Analysis cache cleared');
  }

  /**
   * Generate cache key from query parameters
   */
  private generateCacheKey(query: FrequencyQueryDto): string {
    const { start_date, end_date, grid_size, min_magnitude, max_depth } = query;
    return `analysis:frequency:${start_date}:${end_date}:${grid_size}:${min_magnitude}:${max_depth || 'all'}`;
  }
}
