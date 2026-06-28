import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { FrequencyQueryDto } from './dto/frequency-query.dto';
import {
  GridCell,
  BoundingBox,
  AnalysisConfig,
} from './interfaces/grid-cell.interface';
import * as fs from 'fs';
import * as path from 'path';
import * as turfPointInPolygon from '@turf/boolean-point-in-polygon';
import * as turfHelpers from '@turf/helpers';
import turfCentroid from '@turf/centroid';
import turfBbox from '@turf/bbox';

@Injectable()
export class FrequencyAnalysisService {
  private readonly logger = new Logger(FrequencyAnalysisService.name);
  private villageGeoJson: any = null;
  // Menyimpan Bounding Box (BBox) masing-masing desa untuk fast filtering
  private villageBboxes: Map<string, number[]> = new Map();

  // Classification thresholds
  private readonly config: AnalysisConfig = {
    lowThreshold: 2,
    mediumThreshold: 5,
    highThreshold: Infinity,
  };

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {
    this.loadVillageGeoJson();
  }

  private loadVillageGeoJson() {
    try {
      const filePath = path.join(process.cwd(), 'Data', 'GeoJSon', 'data_desa.geojson');
      const fileData = fs.readFileSync(filePath, 'utf8');
      this.villageGeoJson = JSON.parse(fileData);
      
      // Pre-compute bounding boxes for faster point-in-polygon lookup
      if (this.villageGeoJson.features) {
        this.villageGeoJson.features.forEach((feature: any) => {
           const name = feature.properties.NAMOBJ;
           if (name) {
             try {
               const bbox = turfBbox(feature); // returns [minX, minY, maxX, maxY]
               this.villageBboxes.set(name, bbox);
             } catch(e) {
               this.logger.warn(`Failed to generate bbox for ${name}`);
             }
           }
        });
      }

      this.logger.log('Successfully loaded data_desa.geojson and generated bounding boxes');
    } catch (error) {
      this.logger.error('Failed to load data_desa.geojson', error);
    }
  }

  /**
   * Calculate earthquake frequency for each village polygon
   */
  async calculateFrequency(query: FrequencyQueryDto) {
    const {
      start_date,
      end_date,
      min_magnitude = 0,
      max_depth,
    } = query;

    // --- CACHE LAYER ---
    const cacheKey = `analysis:frequency:village:${start_date}:${end_date}:${min_magnitude}:${max_depth || 'all'}`;
    const cachedData = await this.redisService.get(cacheKey);
    
    if (cachedData) {
      this.logger.log(`Serving village frequency analysis from cache (Key: ${cacheKey})`);
      try {
         return JSON.parse(cachedData);
      } catch (e) {
         // Silently fail and recompute if cache is corrupted
      }
    }
    // ------------------

    this.logger.log(
      `Calculating frequency for villages: ${start_date} to ${end_date}`,
    );

    if (!this.villageGeoJson || !this.villageGeoJson.features) {
      throw new Error('Village GeoJSON data is not loaded.');
    }

    // 1. Ambil semua gempa yang memenuhi kriteria filter dalam SATU kueri
    const where: any = {
      time: {
        gte: new Date(start_date),
        lte: new Date(end_date),
      },
      magnitude: {
        gte: min_magnitude,
      },
    };
    if (max_depth) {
      where.depth = { lte: max_depth };
    }

    const earthquakes = await this.prisma.earthquake.findMany({
      where,
      select: { lat: true, lon: true },
    });

    // 2. Siapkan hitungan untuk setiap desa
    const villageCounts = new Map<string, number>();
    const features = this.villageGeoJson.features;
    
    features.forEach((feature: any) => {
      const name = feature.properties.NAMOBJ;
      if (name) {
        villageCounts.set(name, 0);
      }
    });

    // 3. Hitung jumlah gempa per desa menggunakan Fast BBox filtering + Point-In-Polygon
    for (const eq of earthquakes) {
      if (typeof eq.lat !== 'number' || typeof eq.lon !== 'number') continue;
      
      const point = turfHelpers.point([eq.lon, eq.lat]); // Perhatikan: lon, lat di GeoJSON

      for (const feature of features) {
        const name = feature.properties.NAMOBJ;
        if (!name) continue;

        // FAST PATH: BBox check (Simple number comparison O(1))
        const bbox = this.villageBboxes.get(name);
        if (bbox) {
           const [minLon, minLat, maxLon, maxLat] = bbox;
           if (eq.lon < minLon || eq.lon > maxLon || eq.lat < minLat || eq.lat > maxLat) {
              continue; // Titik di luar bounding box, lompati point-in-polygon!
           }
        }

        // SLOW PATH: Turf Point-In-Polygon check (Hanya dieksekusi jika gempa ada di sekitar bbox desa)
        try {
          if (turfPointInPolygon.default(point, feature)) {
            villageCounts.set(name, (villageCounts.get(name) || 0) + 1);
            break; // Gempa hanya ada di 1 desa
          }
        } catch (e) {
          // Abaikan jika polygon bermasalah
        }
      }
    }

    // 4. Bangun data hasil dengan format yang sama
    const results = features.map((feature: any) => {
      const name = feature.properties.NAMOBJ || 'Unknown';
      const count = villageCounts.get(name) || 0;
      
      let centerLat = 0;
      let centerLon = 0;
      
      try {
        const center = turfCentroid(feature);
        centerLon = center.geometry.coordinates[0];
        centerLat = center.geometry.coordinates[1];
      } catch (e) {
        // Fallback jika tidak bisa hitung centroid
      }

      return {
        grid_id: name, // Gunakan nama desa sebagai ID
        count,
        level: this.classifyFrequency(count),
        center: {
          lat: centerLat,
          lon: centerLon,
        },
        geometry: feature.geometry,
        properties: feature.properties,
      };
    });

    // Calculate statistics
    const statistics = {
      low_count: results.filter((r: any) => r.level === 'low').length,
      medium_count: results.filter((r: any) => r.level === 'medium').length,
      high_count: results.filter((r: any) => r.level === 'high').length,
    };

    // Get total earthquakes
    const totalEarthquakes = await this.getTotalEarthquakes(
      start_date,
      end_date,
      min_magnitude,
      max_depth,
    );

    const finalResponse = {
      metadata: {
        start_date,
        end_date,
        grid_size: 'village', // Indicate this is by village, not grid km
        total_grids: features.length,
        total_earthquakes: totalEarthquakes,
      },
      grids: results,
      statistics,
    };

    // --- SAVE TO CACHE (Expiry: 24 hours = 86400 seconds) ---
    await this.redisService.set(cacheKey, JSON.stringify(finalResponse), 86400);
    // --------------------------------------------------------

    return finalResponse;
  }

  /**
   * Classify frequency level based on count
   */
  classifyFrequency(count: number): 'low' | 'medium' | 'high' {
    if (count <= this.config.lowThreshold) {
      return 'low';
    } else if (count <= this.config.mediumThreshold) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Get total earthquakes in date range
   */
  private async getTotalEarthquakes(
    startDate: string,
    endDate: string,
    minMagnitude: number,
    maxDepth?: number,
  ): Promise<number> {
    const where: any = {
      time: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      magnitude: {
        gte: minMagnitude,
      },
    };

    if (maxDepth) {
      where.depth = {
        lte: maxDepth,
      };
    }

    return this.prisma.earthquake.count({ where });
  }

  /**
   * Get analysis statistics
   */
  async getStatistics(startDate: string, endDate: string) {
    const earthquakes = await this.prisma.earthquake.findMany({
      where: {
        time: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      select: {
        magnitude: true,
        lat: true,
        lon: true,
      },
    });

    if (earthquakes.length === 0) {
      return {
        total_earthquakes: 0,
        avg_magnitude: 0,
        max_magnitude: 0,
        most_active_area: null,
        distribution: {
          low: 0,
          medium: 0,
          high: 0,
        },
      };
    }

    const avgMagnitude =
      earthquakes.reduce((sum, eq) => sum + eq.magnitude, 0) /
      earthquakes.length;
    const maxMagnitude = Math.max(...earthquakes.map((eq) => eq.magnitude));

    return {
      total_earthquakes: earthquakes.length,
      avg_magnitude: Number(avgMagnitude.toFixed(2)),
      max_magnitude: maxMagnitude,
      most_active_area: null, // TODO: Calculate from grid analysis
      distribution: {
        low: 0,
        medium: 0,
        high: 0,
      },
    };
  }
}
