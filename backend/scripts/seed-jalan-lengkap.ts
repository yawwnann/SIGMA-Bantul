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
  console.log('🚀 Starting road network import from Jalan_fix.geojson...');

  const geojsonPath = path.join(__dirname, '../Data/GeoJSon/Jalan_fix.geojson');

  if (!fs.existsSync(geojsonPath)) {
    console.error('❌ Dataset not found at:', geojsonPath);
    console.log('Please ensure the file exists before running this script.');
    process.exit(1);
  }

  console.log('📁 Reading Jalan_fix.geojson...');
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

      const oneway = properties.oneway || 'no';

      await prisma.$executeRaw`
        INSERT INTO "Road" (name, type, condition, vulnerability, oneway, geometry, geom, "createdAt", "updatedAt")
        VALUES (
          ${name},
          ${roadType}::"RoadType",
          ${condition}::"RoadCondition",
          ${vulnerability}::"RoadVulnerability",
          ${oneway},
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
  
  // ==========================================
  // AUTOMATIC TOPOLOGY & COST CALCULATION
  // ==========================================
  console.log('\n📏 Menghitung panjang jalan, cost (Weighted Overlay), dan reverse_cost (Oneway)...');
  
  // Bobot default (Jarak 50%, Hazard 25%, Kondisi 25%)
  const wHazard = 0.25;
  const wCondition = 0.25;

  const lengthResult = await prisma.$executeRaw`
    WITH RoadScores AS (
      SELECT 
        id,
        ST_Length(geom::geography) as dist,
        COALESCE("combinedHazard", 2) as hazard_score,
        CASE condition
          WHEN 'GOOD' THEN 1
          WHEN 'MODERATE' THEN 2
          WHEN 'POOR' THEN 3
          WHEN 'DAMAGED' THEN 4
          ELSE 2
        END as condition_score
      FROM "Road"
      WHERE geom IS NOT NULL
    ),
    CalculatedCosts AS (
      SELECT
        id,
        dist,
        -- Weighted Overlay Formula
        dist * (1 + (hazard_score * ${wHazard}) + (condition_score * ${wCondition})) as base_cost
      FROM RoadScores
    )
    UPDATE "Road" r
    SET 
      length = c.dist,
      length_m = c.dist,
      safe_cost = c.base_cost,
      cost = CASE 
        WHEN r.oneway = '-1' THEN -1 
        ELSE c.base_cost 
      END,
      reverse_cost = CASE 
        WHEN r.oneway = 'yes' THEN -1 
        ELSE c.base_cost 
      END
    FROM CalculatedCosts c
    WHERE r.id = c.id;
  `;
  console.log(`✅ ${lengthResult} jalan updated dengan length, cost, safe_cost, dan reverse_cost`);

  console.log('\n🗺️  Membuat topology untuk routing...');
  console.log('   (Ini mungkin memakan waktu beberapa menit, harap sabar...)');
  
  try {
    await prisma.$executeRaw`
      SELECT pgr_createTopology(
        'Road',
        0.0001,
        'geom',
        'id',
        'source',
        'target',
        rows_where := 'geom IS NOT NULL'
      )
    `;
    console.log('✅ Topology berhasil dibuat');

    await prisma.$executeRaw`
      SELECT pgr_analyzeGraph(
        'Road',
        0.0001,
        'geom',
        'id',
        'source',
        'target'
      )
    `;
    console.log('✅ Topology berhasil dianalisis');
  } catch (error: any) {
    console.log('⚠️  pgRouting belum terinstall atau error:', error.message);
  }

  console.log(`\n✅ Selesai! Data jalan, topology, dan perhitungan biaya rute sudah komplit.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
