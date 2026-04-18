import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FrequencyQueryDto } from './dto/frequency-query.dto';
import {
  GridCell,
  BoundingBox,
  AnalysisConfig,
} from './interfaces/grid-cell.interface';

@Injectable()
export class FrequencyAnalysisService {
  private readonly logger = new Logger(FrequencyAnalysisService.name);

  // Default configuration for Bantul area (more focused)
  private readonly defaultBounds: BoundingBox = {
    minLon: 110.25, // Batas barat Bantul
    minLat: -8.0, // Batas selatan Bantul
    maxLon: 110.5, // Batas timur Bantul
    maxLat: -7.75, // Batas utara Bantul
  };

  // Classification thresholds
  private readonly config: AnalysisConfig = {
    lowThreshold: 2,
    mediumThreshold: 5,
    highThreshold: Infinity,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Generate grid cells for the analysis area
   */
  generateGrid(bounds: BoundingBox, gridSizeKm: number): GridCell[] {
    const grids: GridCell[] = [];

    // Convert km to degrees (approximate)
    // 1 degree ≈ 111 km at equator
    const gridSizeDeg = gridSizeKm / 111;

    let gridId = 1;
    for (let lon = bounds.minLon; lon < bounds.maxLon; lon += gridSizeDeg) {
      for (let lat = bounds.minLat; lat < bounds.maxLat; lat += gridSizeDeg) {
        const maxLon = Math.min(lon + gridSizeDeg, bounds.maxLon);
        const maxLat = Math.min(lat + gridSizeDeg, bounds.maxLat);

        grids.push({
          grid_id: `cell_${gridId}`,
          minLon: lon,
          minLat: lat,
          maxLon,
          maxLat,
          geometry: `POLYGON((${lon} ${lat}, ${maxLon} ${lat}, ${maxLon} ${maxLat}, ${lon} ${maxLat}, ${lon} ${lat}))`,
        });

        gridId++;
      }
    }

    this.logger.log(`Generated ${grids.length} grid cells`);
    return grids;
  }

  /**
   * Calculate earthquake frequency for each grid cell
   */
  async calculateFrequency(query: FrequencyQueryDto) {
    const {
      start_date,
      end_date,
      grid_size = 5,
      min_magnitude = 0,
      max_depth,
    } = query;

    this.logger.log(
      `Calculating frequency: ${start_date} to ${end_date}, grid: ${grid_size}km`,
    );

    // Generate grid cells
    const grids = this.generateGrid(this.defaultBounds, grid_size);

    // Build SQL query for frequency calculation
    const results = await Promise.all(
      grids.map(async (grid) => {
        const whereConditions = [
          `time >= '${start_date}'`,
          `time <= '${end_date}'`,
          `magnitude >= ${min_magnitude}`,
        ];

        if (max_depth) {
          whereConditions.push(`depth <= ${max_depth}`);
        }

        // Use PostGIS ST_Contains to check if earthquake is in grid
        const countQuery = `
          SELECT COUNT(*) as count
          FROM "Earthquake"
          WHERE ${whereConditions.join(' AND ')}
          AND ST_Contains(
            ST_GeomFromText('${grid.geometry}', 4326),
            geom
          )
        `;

        const result =
          await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(countQuery);
        const count = Number(result[0]?.count || 0);

        // Calculate center point
        const centerLon = (grid.minLon + grid.maxLon) / 2;
        const centerLat = (grid.minLat + grid.maxLat) / 2;

        // Convert to GeoJSON
        const geometry = {
          type: 'Polygon',
          coordinates: [
            [
              [grid.minLon, grid.minLat],
              [grid.maxLon, grid.minLat],
              [grid.maxLon, grid.maxLat],
              [grid.minLon, grid.maxLat],
              [grid.minLon, grid.minLat],
            ],
          ],
        };

        return {
          grid_id: grid.grid_id,
          count,
          level: this.classifyFrequency(count),
          center: {
            lat: centerLat,
            lon: centerLon,
          },
          geometry,
        };
      }),
    );

    // Calculate statistics
    const statistics = {
      low_count: results.filter((r) => r.level === 'low').length,
      medium_count: results.filter((r) => r.level === 'medium').length,
      high_count: results.filter((r) => r.level === 'high').length,
    };

    // Get total earthquakes
    const totalEarthquakes = await this.getTotalEarthquakes(
      start_date,
      end_date,
      min_magnitude,
      max_depth,
    );

    return {
      metadata: {
        start_date,
        end_date,
        grid_size,
        total_grids: grids.length,
        total_earthquakes: totalEarthquakes,
      },
      grids: results,
      statistics,
    };
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
