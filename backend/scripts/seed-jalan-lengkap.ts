import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RoadFeature {
  type: 'Feature';
  properties: {
    fid?: number;
    osm_id?: string;
    surface?: string;
    name?: string;
    lanes?: string;
    highway?: string;
    width?: string;
    smoothness?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: RoadFeature[];
}

async function main() {
  console.log('🚀 Starting road network import from Jalan_Lengkap.geojson...');

  const geojsonPath = path.join(__dirname, '../Data/GeoJSon/Jalan_Lengkap.geojson');

  if (!fs.existsSync(geojsonPath)) {
    console.error('❌ Dataset not found at:', geojsonPath);
    console.log('Please ensure the file exists before running this script.');
    process.exit(1);
  }

  console.log('📁 Reading Jalan_Lengkap.geojson...');
  const geojsonData: GeoJSONFeatureCollection = JSON.parse(
    fs.readFileSync(geojsonPath, 'utf-8'),
  );

  console.log(`✅ Found ${geojsonData.features.length} road features`);

  // Clear existing road network data
  console.log('🗑️  Clearing existing road network (TRUNCATE TABLE "Road")...');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Road" RESTART IDENTITY CASCADE`,
  );

  console.log('💾 Importing roads to database...');

  let imported = 0;
  let skipped = 0;

  for (const feature of geojsonData.features) {
    try {
      const { properties, geometry } = feature;

      // Extract road name
      const name = properties.name && properties.name.trim() ? properties.name.trim() : `Road ${imported + 1}`;

      // Determine road type from highway property
      let roadType: 'NATIONAL' | 'PROVINCIAL' | 'REGIONAL' | 'LOCAL' = 'LOCAL';
      const highway = (properties.highway || '').toLowerCase();
      if (highway === 'trunk' || name.toLowerCase().includes('nasional')) {
        roadType = 'NATIONAL';
      } else if (highway === 'primary' || name.toLowerCase().includes('provinsi')) {
        roadType = 'PROVINCIAL';
      } else if (highway === 'secondary' || highway === 'tertiary' || name.toLowerCase().includes('kabupaten')) {
        roadType = 'REGIONAL';
      }

      // Determine condition based on smoothness and surface
      let condition: 'GOOD' | 'MODERATE' | 'POOR' | 'DAMAGED' = 'GOOD';
      const smoothness = (properties.smoothness || '').toLowerCase();
      const surface = (properties.surface || '').toLowerCase();

      if (smoothness === 'very_bad' || smoothness === 'horrible' || smoothness === 'impassable' || surface.includes('rusak berat')) {
        condition = 'DAMAGED';
      } else if (smoothness === 'bad' || surface.includes('rusak') || surface === 'unpaved') {
        condition = 'POOR';
      } else if (smoothness === 'intermediate' || surface.includes('sedang')) {
        condition = 'MODERATE';
      } else if (smoothness === 'good' || smoothness === 'excellent' || surface === 'asphalt' || surface === 'paved') {
        condition = 'GOOD';
      }

      // Determine vulnerability
      let vulnerability: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (roadType === 'LOCAL') {
        vulnerability = 'MEDIUM';
      }
      if (condition === 'POOR') {
        vulnerability = 'HIGH';
      }
      if (condition === 'DAMAGED') {
        vulnerability = 'CRITICAL';
      }

      // Convert geometry
      let geomCoords: number[][];
      if (geometry.type === 'MultiLineString') {
        geomCoords = geometry.coordinates[0] as number[][];
      } else {
        geomCoords = geometry.coordinates as number[][];
      }

      if (!Array.isArray(geomCoords) || geomCoords.length < 2 || !Array.isArray(geomCoords[0])) {
        skipped++;
        continue;
      }

      const coords2D = geomCoords.map((coord) => [coord[0], coord[1]]);
      const lineStringGeometry = {
        type: 'LineString',
        coordinates: coords2D,
      };

      await prisma.$executeRaw`
        INSERT INTO "Road" (name, type, condition, vulnerability, geometry, geom, "createdAt", "updatedAt")
        VALUES (
          ${name},
          ${roadType}::"RoadType",
          ${condition}::"RoadCondition",
          ${vulnerability}::"RoadVulnerability",
          ${JSON.stringify(lineStringGeometry)}::jsonb,
          ST_GeomFromGeoJSON(${JSON.stringify(lineStringGeometry)}),
          NOW(),
          NOW()
        )
      `;

      imported++;

      if (imported % 1000 === 0) {
        console.log(`  ⏳ Imported ${imported} roads...`);
      }
    } catch (error: any) {
      console.error(`Error on road ${imported + skipped + 1}:`, error.message || error);
      skipped++;
    }
  }

  console.log(`\n🎉 Import Complete!`);
  console.log(`✅ Successfully imported: ${imported} roads`);
  console.log(`⚠️  Skipped (invalid geometry/errors): ${skipped} roads`);
  
  console.log(`\nNext recommended step: run fix-topology and fix-all-roads scripts to rebuild routing data.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
