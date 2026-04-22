import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RoadFeature {
  type: 'Feature';
  properties: {
    // Dataset A: JALAN_LN_25K.geojson fields
    NAMOBJ?: string;    // Road name (primary)
    NAMRJL?: string;    // Also road name (fallback)
    FCODE?: string;     // Feature code (e.g. AP030 = National, AP030003 = Provincial)
    RJLKLS?: string;    // Road class/type
    RJLSURFACE?: string;
    RJLWIDTH?: number;
    SRS_ID?: string;
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

async function importRoads() {
  console.log('🚀 Starting road network import from Dataset A (JALAN_LN_25K.geojson)...');

  // Dataset A: JALAN_LN_25K.geojson - primary road geometry layer
  const geojsonPath = path.join(__dirname, '../Data/GeoJSon/JALAN_LN_25K.geojson');

  // Check if GeoJSON exists
  if (!fs.existsSync(geojsonPath)) {
    console.error('❌ Dataset A not found at:', geojsonPath);
    console.log('');
    console.log('Expected file: backend/Data/GeoJSon/JALAN_LN_25K.geojson');
    console.log('Please ensure the file exists before running this script.');
    process.exit(1);
  }

  console.log('📁 Reading JALAN_LN_25K.geojson (Dataset A)...');
  const geojsonData: GeoJSONFeatureCollection = JSON.parse(
    fs.readFileSync(geojsonPath, 'utf-8'),
  );

  console.log(`✅ Found ${geojsonData.features.length} road features in Dataset A`);
  console.log('');
  console.log('💡 Note: Road names will be generic placeholders.');
  console.log('   After import, run: npm run db:enrich-roads');
  console.log('   to enrich names from Dataset B (NAMA_RUAS_JALAN.geojson).');
  console.log('');

  // Clear existing road network data
  console.log('🗑️  Clearing existing road network...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Road" RESTART IDENTITY CASCADE`);

  console.log('💾 Importing roads to database...');

  let imported = 0;
  let skipped = 0;

  for (const feature of geojsonData.features) {
    try {
      const { properties, geometry } = feature;

      // Extract road name from Dataset A fields
      // NAMOBJ is the primary name field in JALAN_LN_25K
      const rawName =
        properties.NAMOBJ ||
        properties.NAMRJL ||
        properties.name ||
        properties.NAME;

      // Placeholder name — will be enriched by enrich-roads.ts (Dataset B)
      const name = rawName && rawName.trim() ? rawName.trim() : `Road ${imported + 1}`;

      // Determine road type from FCODE or RJLKLS
      let roadType: 'NATIONAL' | 'PROVINCIAL' | 'REGIONAL' | 'LOCAL' = 'LOCAL';
      const fcode = (properties.FCODE || '').toUpperCase();
      const rjlkls = (properties.RJLKLS || '').toString();

      // FCODE mappings for Indonesian road network:
      // AP030      = National road
      // AP030003   = Provincial road
      // AP030004   = Regional/Kabupaten road
      if (fcode === 'AP030' || rjlkls === '1' || rjlkls.startsWith('N') ||
          name.toLowerCase().includes('nasional')) {
        roadType = 'NATIONAL';
      } else if (fcode === 'AP030003' || rjlkls === '2' || rjlkls.startsWith('P') ||
                 name.toLowerCase().includes('provinsi')) {
        roadType = 'PROVINCIAL';
      } else if (fcode === 'AP030004' || rjlkls === '3' || rjlkls.startsWith('K') ||
                 name.toLowerCase().includes('kabupaten')) {
        roadType = 'REGIONAL';
      }

      // Determine condition based on surface type
      let condition: 'GOOD' | 'MODERATE' | 'POOR' | 'DAMAGED' = 'GOOD';
      const surface = (properties.RJLSURFACE || '').toLowerCase();
      if (surface.includes('rusak berat') || surface.includes('damaged')) {
        condition = 'DAMAGED';
      } else if (surface.includes('rusak') || surface.includes('poor')) {
        condition = 'POOR';
      } else if (surface.includes('sedang') || surface.includes('moderate')) {
        condition = 'MODERATE';
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

      // Convert geometry to proper format
      let geomCoords: number[][];
      if (geometry.type === 'MultiLineString') {
        // For MultiLineString, take the first linestring
        geomCoords = geometry.coordinates[0] as number[][];
      } else {
        geomCoords = geometry.coordinates as number[][];
      }

      // Skip if coordinates are invalid
      if (
        !Array.isArray(geomCoords) ||
        geomCoords.length < 2 ||
        !Array.isArray(geomCoords[0])
      ) {
        skipped++;
        continue;
      }

      // Strip Z dimension (elevation) - only keep X and Y (lon, lat)
      const coords2D = geomCoords.map((coord) => [coord[0], coord[1]]);

      // Create LineString geometry
      const lineStringGeometry = {
        type: 'LineString',
        coordinates: coords2D,
      };

      // Insert into database using raw SQL for PostGIS
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

      if (imported % 100 === 0) {
        console.log(`  ⏳ Imported ${imported} roads...`);
      }
    } catch (error) {
      console.error(`  ⚠️  Error importing road: ${error.message}`);
      skipped++;
    }
  }

  console.log('');
  console.log('✅ Import completed!');
  console.log(`  📊 Imported: ${imported} roads`);
  console.log(`  ⚠️  Skipped: ${skipped} roads`);

  // Create topology for pgRouting
  console.log('');
  console.log('🔧 Setting up pgRouting topology...');

  try {
    // Add routing columns if not exists
    await prisma.$executeRaw`
      ALTER TABLE "Road" 
      ADD COLUMN IF NOT EXISTS source INTEGER,
      ADD COLUMN IF NOT EXISTS target INTEGER,
      ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS reverse_cost DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS length_m DOUBLE PRECISION
    `;

    // Calculate length in meters
    await prisma.$executeRaw`
      UPDATE "Road" 
      SET length_m = ST_Length(geom::geography)
      WHERE length_m IS NULL
    `;

    // Set cost based on length (in minutes, assuming 40 km/h average speed)
    await prisma.$executeRaw`
      UPDATE "Road" 
      SET cost = (length_m / 1000.0) / 40.0 * 60.0,
          reverse_cost = (length_m / 1000.0) / 40.0 * 60.0
      WHERE cost IS NULL
    `;

    console.log('✅ Routing columns configured');

    // Note: pgr_createTopology requires pgRouting extension
    // Run this manually in PostgreSQL if needed:
    console.log('');
    console.log('📝 To enable routing, run this SQL manually:');
    console.log('');
    console.log("  SELECT pgr_createTopology('Road', 0.001, 'geom', 'id');");
    console.log("  SELECT pgr_analyzeGraph('Road', 0.001, 'geom', 'id');");
    console.log('');
  } catch (error) {
    console.error('⚠️  Error setting up routing:', error.message);
  }

  console.log('🎉 Road network is ready!');

  // Invalidate Redis caches for road-network data
  console.log('');
  console.log('🔄 Invalidating Redis road-network cache...');
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Delete all road-network cache keys
    const keys = await redis.keys('road-network:*');
    const evacKeys = await redis.keys('evacuation:route:*');
    const allKeys = [...keys, ...evacKeys];

    if (allKeys.length > 0) {
      await redis.del(...allKeys);
      console.log(`   ✅ Deleted ${allKeys.length} stale cache keys`);
    } else {
      console.log('   ℹ️  No stale cache keys found');
    }

    await redis.quit();
  } catch (err) {
    console.warn(`   ⚠️  Could not invalidate Redis cache (non-fatal): ${err.message}`);
    console.warn('      Restart the backend server to clear the cache manually.');
  }
}

importRoads()
  .catch((e) => {
    console.error('❌ Error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
