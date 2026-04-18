import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RoadFeature {
  type: 'Feature';
  properties: {
    NAMRJL?: string;
    FCODE?: string;
    RJLKLS?: string;
    RJLSURFACE?: string;
    RJLWIDTH?: number;
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
  console.log('🚀 Starting road network import from SHP...');

  // Path to GeoJSON file (you need to convert SHP to GeoJSON first)
  const geojsonPath = path.join(__dirname, '../Data/Jalan_bantul.geojson');

  // Check if GeoJSON exists, if not, provide instructions
  if (!fs.existsSync(geojsonPath)) {
    console.log('📝 GeoJSON file not found. Converting SHP to GeoJSON...');
    console.log('');
    console.log('Please run one of these commands:');
    console.log('');
    console.log('Option 1 - Using ogr2ogr (GDAL):');
    console.log(
      '  ogr2ogr -f GeoJSON Data/JALAN_LN_25K.geojson Data/JALAN_LN_25K.shp',
    );
    console.log('');
    console.log('Option 2 - Using QGIS:');
    console.log('  1. Open JALAN_LN_25K.shp in QGIS');
    console.log('  2. Right-click layer > Export > Save Features As');
    console.log('  3. Format: GeoJSON, CRS: EPSG:4326 (WGS84)');
    console.log('');
    console.log('Option 3 - Using online converter:');
    console.log('  https://mygeodata.cloud/converter/shp-to-geojson');
    console.log('');
    process.exit(1);
  }

  console.log('📁 Reading GeoJSON file...');
  const geojsonData: GeoJSONFeatureCollection = JSON.parse(
    fs.readFileSync(geojsonPath, 'utf-8'),
  );

  console.log(`✅ Found ${geojsonData.features.length} road features`);

  // Clear existing road network data
  console.log('🗑️  Clearing existing road network...');
  await prisma.$executeRaw`DELETE FROM "Road" WHERE name LIKE 'Road%' OR name LIKE 'Jalan%'`;

  console.log('💾 Importing roads to database...');

  let imported = 0;
  let skipped = 0;

  for (const feature of geojsonData.features) {
    try {
      const { properties, geometry } = feature;

      // Extract road name
      const name =
        properties.NAMRJL ||
        properties.name ||
        properties.NAME ||
        `Road ${imported + 1}`;

      // Determine road type based on classification
      let roadType: 'NATIONAL' | 'PROVINCIAL' | 'REGIONAL' | 'LOCAL' = 'LOCAL';
      const fcode = properties.FCODE || '';
      const rjlkls = properties.RJLKLS || '';

      if (
        fcode.includes('NATIONAL') ||
        rjlkls.includes('1') ||
        name.toLowerCase().includes('nasional')
      ) {
        roadType = 'NATIONAL';
      } else if (
        fcode.includes('PROVINCIAL') ||
        rjlkls.includes('2') ||
        name.toLowerCase().includes('provinsi')
      ) {
        roadType = 'PROVINCIAL';
      } else if (
        fcode.includes('REGIONAL') ||
        rjlkls.includes('3') ||
        name.toLowerCase().includes('kabupaten')
      ) {
        roadType = 'REGIONAL';
      }

      // Determine condition based on surface
      let condition: 'GOOD' | 'MODERATE' | 'POOR' = 'GOOD';
      const surface = (properties.RJLSURFACE || '').toLowerCase();
      if (surface.includes('rusak') || surface.includes('poor')) {
        condition = 'POOR';
      } else if (surface.includes('sedang') || surface.includes('moderate')) {
        condition = 'MODERATE';
      }

      // Determine vulnerability (simplified logic)
      let vulnerability: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (roadType === 'LOCAL') {
        vulnerability = 'MEDIUM';
      }
      if (condition === 'POOR') {
        vulnerability = 'HIGH';
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
}

importRoads()
  .catch((e) => {
    console.error('❌ Error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
