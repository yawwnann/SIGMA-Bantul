import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BpbdRiskLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export interface ImportResult {
  imported: number;
  errors: number;
  total: number;
  skipped: number;
}

export interface AssignmentResult {
  totalRoads: number;
  assigned: number;
  defaulted: number;
  byRiskLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
}

export interface RiskStatistics {
  totalZones: number;
  byRiskLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  totalRoads: number;
  roadsWithBpbdRisk: number;
  roadsByRiskLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
}

@Injectable()
export class BpbdRiskService {
  private readonly logger = new Logger(BpbdRiskService.name);
  private cachedGeoJson: any = null;

  constructor(private prisma: PrismaService) {}

  async getRiskGeoJson(): Promise<any> {
    if (this.cachedGeoJson) {
      return this.cachedGeoJson;
    }

    try {
      const geoJsonPath = path.join(
        process.cwd(),
        'Data',
        'GeoJSon',
        'Data Wilayah dengan tingkat resiko gempa.geojson',
      );

      this.logger.log(`Reading BPBD Risk Data from: ${geoJsonPath}`);
      const fileData = await fs.promises.readFile(geoJsonPath, 'utf-8');
      const parsedData = JSON.parse(fileData);

      // Cache in memory
      this.cachedGeoJson = parsedData;
      return parsedData;
    } catch (error) {
      this.logger.error('Failed to load BPBD Risk GeoJSON', error.stack);
      throw new InternalServerErrorException('Gagal memuat data risiko BPBD');
    }
  }

  async getAllZones() {
    return this.prisma.bpbdRiskZone.findMany({
      orderBy: [{ kecamatan: 'asc' }, { desa: 'asc' }],
    });
  }

  async getZoneById(id: number) {
    return this.prisma.bpbdRiskZone.findUnique({
      where: { id },
    });
  }

  async importGeoJson(): Promise<ImportResult> {
    this.logger.log('Starting BPBD GeoJSON import...');

    const geoJsonPath = path.join(
      process.cwd(),
      'Data',
      'GeoJSon',
      'Data Wilayah dengan tingkat resiko gempa.geojson',
    );

    if (!fs.existsSync(geoJsonPath)) {
      throw new InternalServerErrorException(
        `GeoJSON file not found: ${geoJsonPath}`,
      );
    }

    const fileData = fs.readFileSync(geoJsonPath, 'utf-8');
    const geojson = JSON.parse(fileData);

    if (!geojson.features || !Array.isArray(geojson.features)) {
      throw new InternalServerErrorException(
        'Invalid GeoJSON format: missing features array',
      );
    }

    // Group features by kecamatan + desa to find unique zones
    const uniqueZones = new Map();

    for (const feature of geojson.features) {
      const props = feature.properties;

      if (!props.kecamatan || !props.desa || !props.bahaya) {
        continue;
      }

      const key = `${props.kecamatan}-${props.desa}`;

      if (!uniqueZones.has(key)) {
        uniqueZones.set(key, {
          kecamatan: props.kecamatan,
          desa: props.desa,
          bahaya: props.bahaya,
          geometry: feature.geometry,
          props: props,
        });
      }
    }

    let imported = 0;
    let errors = 0;
    let skipped = 0;

    for (const [key, zone] of uniqueZones) {
      try {
        const riskLevel = this.mapRiskLevel(zone.bahaya);
        const name = `${zone.kecamatan} - ${zone.desa}`;

        // Check if already exists
        const existing = await this.prisma.bpbdRiskZone.findFirst({
          where: {
            kecamatan: zone.kecamatan,
            desa: zone.desa,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Insert using raw SQL for PostGIS geometry
        await this.prisma.$executeRaw`
          INSERT INTO "BpbdRiskZone" (
            kecamatan,
            desa,
            name,
            "riskLevel",
            bahaya,
            "iaGempa",
            "taGempa",
            "tRisk",
            "skorTRisk",
            "kodeDesa",
            "kodeKec",
            geometry,
            geom,
            area,
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${zone.kecamatan},
            ${zone.desa},
            ${name},
            ${riskLevel}::"BpbdRiskLevel",
            ${zone.bahaya},
            ${zone.props.ia_gempa || null},
            ${zone.props.ta_gempa || null},
            ${zone.props.trisk || null},
            ${zone.props.skor_trisk || null},
            ${zone.props.kode_desa || null},
            ${zone.props.kode_kec || null},
            ${JSON.stringify(zone.geometry)}::jsonb,
            ST_GeomFromGeoJSON(${JSON.stringify(zone.geometry)}),
            ST_Area(ST_GeomFromGeoJSON(${JSON.stringify(zone.geometry)})::geography) / 1000000,
            NOW(),
            NOW()
          )
        `;

        imported++;
        this.logger.log(`Imported: ${name} (${riskLevel})`);
      } catch (error) {
        errors++;
        this.logger.error(`Error importing ${key}:`, error.message);
      }
    }

    this.logger.log(
      `Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`,
    );

    return {
      imported,
      errors,
      total: geojson.features.length,
      skipped,
    };
  }

  async assignRiskToRoads(): Promise<AssignmentResult> {
    this.logger.log('Starting BPBD risk assignment to roads...');

    // Get total roads count
    const totalRoads = await this.prisma.road.count();

    // Perform spatial join to assign BPBD risk to roads
    await this.prisma.$executeRaw`
      UPDATE "Road" r
      SET 
        "bpbdRiskLevel" = subquery."riskLevel",
        "bpbdRiskScore" = CASE 
          WHEN subquery."riskLevel" = 'LOW' THEN 1
          WHEN subquery."riskLevel" = 'MEDIUM' THEN 2
          WHEN subquery."riskLevel" = 'HIGH' THEN 3
          ELSE 1
        END,
        "updatedAt" = NOW()
      FROM (
        SELECT DISTINCT ON (r2.id)
          r2.id as road_id,
          brz."riskLevel"
        FROM "Road" r2
        JOIN "BpbdRiskZone" brz ON ST_Intersects(r2.geom, brz.geom)
        ORDER BY r2.id, 
          CASE brz."riskLevel"
            WHEN 'HIGH' THEN 3
            WHEN 'MEDIUM' THEN 2
            WHEN 'LOW' THEN 1
          END DESC
      ) subquery
      WHERE r.id = subquery.road_id
    `;

    // Count assigned roads
    const assignedCount = await this.prisma.road.count({
      where: {
        bpbdRiskLevel: { not: null },
      },
    });

    // Set default LOW risk for roads not intersecting any zone
    await this.prisma.$executeRaw`
      UPDATE "Road"
      SET 
        "bpbdRiskLevel" = 'LOW',
        "bpbdRiskScore" = 1,
        "updatedAt" = NOW()
      WHERE "bpbdRiskLevel" IS NULL
    `;

    const defaultedCount = totalRoads - assignedCount;

    // Recalculate combined hazard
    await this.recalculateCombinedHazard();

    // Get statistics by risk level
    const lowCount = await this.prisma.road.count({
      where: { bpbdRiskLevel: 'LOW' },
    });

    const mediumCount = await this.prisma.road.count({
      where: { bpbdRiskLevel: 'MEDIUM' },
    });

    const highCount = await this.prisma.road.count({
      where: { bpbdRiskLevel: 'HIGH' },
    });

    this.logger.log(
      `Assignment completed: ${assignedCount} assigned, ${defaultedCount} defaulted`,
    );

    return {
      totalRoads,
      assigned: assignedCount,
      defaulted: defaultedCount,
      byRiskLevel: {
        LOW: lowCount,
        MEDIUM: mediumCount,
        HIGH: highCount,
      },
    };
  }

  async recalculateCombinedHazard(): Promise<void> {
    this.logger.log('Recalculating combined hazard scores...');

    // Calculate combined hazard: 50% vulnerability + 50% BPBD risk
    await this.prisma.$executeRaw`
      UPDATE "Road"
      SET "combinedHazard" = (
        (CASE 
          WHEN vulnerability = 'LOW' THEN 1
          WHEN vulnerability = 'MEDIUM' THEN 2.5
          WHEN vulnerability = 'HIGH' THEN 4
          WHEN vulnerability = 'CRITICAL' THEN 5
          ELSE 2
        END * 0.5) + 
        (COALESCE("bpbdRiskScore", 1) * 0.5)
      )
      WHERE "bpbdRiskLevel" IS NOT NULL
    `;

    // Update safe_cost based on combined hazard
    await this.prisma.$executeRaw`
      UPDATE "Road"
      SET safe_cost = 
        COALESCE(length, 1) * (1 + COALESCE("combinedHazard", 2) * 0.5)
      WHERE geom IS NOT NULL AND "combinedHazard" IS NOT NULL
    `;

    this.logger.log('Combined hazard recalculation completed');
  }

  async getRoadRiskStatistics(): Promise<RiskStatistics> {
    const totalZones = await this.prisma.bpbdRiskZone.count();

    const zonesByRisk = await this.prisma.bpbdRiskZone.groupBy({
      by: ['riskLevel'],
      _count: true,
    });

    const totalRoads = await this.prisma.road.count();
    const roadsWithBpbdRisk = await this.prisma.road.count({
      where: { bpbdRiskLevel: { not: null } },
    });

    const roadsByRisk = await this.prisma.road.groupBy({
      by: ['bpbdRiskLevel'],
      _count: true,
      where: { bpbdRiskLevel: { not: null } },
    });

    // Convert arrays to objects
    const byRiskLevel = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    zonesByRisk.forEach((item) => {
      if (item.riskLevel) {
        byRiskLevel[item.riskLevel] = item._count;
      }
    });

    const roadsByRiskLevel = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    roadsByRisk.forEach((item) => {
      if (item.bpbdRiskLevel) {
        roadsByRiskLevel[item.bpbdRiskLevel] = item._count;
      }
    });

    return {
      totalZones,
      byRiskLevel,
      totalRoads,
      roadsWithBpbdRisk,
      roadsByRiskLevel,
    };
  }

  async validateBpbdVsFrequency() {
    // This method would compare BPBD risk levels with earthquake frequency data
    // For now, return basic validation info
    const stats = await this.getRoadRiskStatistics();

    return {
      message: 'BPBD validation completed',
      statistics: stats,
      recommendations: [
        'Compare BPBD HIGH risk areas with earthquake frequency hotspots',
        'Verify spatial alignment between BPBD zones and historical earthquake data',
        'Check for roads with conflicting risk assessments',
      ],
    };
  }

  private mapRiskLevel(bahaya: string): BpbdRiskLevel {
    const lower = bahaya?.toLowerCase() || '';

    if (lower.includes('tinggi') || lower.includes('high')) {
      return BpbdRiskLevel.HIGH;
    }

    if (
      lower.includes('sedang') ||
      lower.includes('medium') ||
      lower.includes('menengah')
    ) {
      return BpbdRiskLevel.MEDIUM;
    }

    return BpbdRiskLevel.LOW;
  }
}
