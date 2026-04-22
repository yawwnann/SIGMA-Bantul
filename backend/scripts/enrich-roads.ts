import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface NamedRoadFeature {
  type: 'Feature';
  properties: {
    ogc_fid: number;
    objectid: number;
    namobj: string;
    fcode?: string;
    remark?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: NamedRoadFeature[];
}

async function enrichRoads() {
  console.log('🚀 Starting road name enrichment...');
  console.log('');

  // ── Step 1: Read Dataset B (NAMA_RUAS_JALAN.geojson) ──
  const geojsonPath = path.join(
    __dirname,
    '../Data/GeoJSon/NAMA_RUAS_JALAN.geojson',
  );

  if (!fs.existsSync(geojsonPath)) {
    console.error('❌ NAMA_RUAS_JALAN.geojson not found at:', geojsonPath);
    process.exit(1);
  }

  console.log('📁 Reading NAMA_RUAS_JALAN.geojson...');
  const geojsonData: GeoJSONCollection = JSON.parse(
    fs.readFileSync(geojsonPath, 'utf-8'),
  );
  console.log(`   Found ${geojsonData.features.length} named road features`);

  // ── Step 2: Create temporary staging table ──
  console.log('');
  console.log('🗄️  Creating temporary staging table "roads_named"...');

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS roads_named`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE roads_named (
      id SERIAL PRIMARY KEY,
      namobj TEXT NOT NULL,
      geom geometry(LineString, 4326)
    )
  `);

  // ── Step 3: Insert Dataset B into staging table ──
  console.log('💾 Inserting named roads into staging table...');

  let inserted = 0;
  let skipped = 0;

  for (const feature of geojsonData.features) {
    try {
      const { properties, geometry } = feature;
      const namobj = properties.namobj;

      if (!namobj || !namobj.trim()) {
        skipped++;
        continue;
      }

      // Normalize: convert MultiLineString to individual LineStrings
      let lineStrings: number[][][];

      if (geometry.type === 'MultiLineString') {
        lineStrings = geometry.coordinates as number[][][];
      } else if (geometry.type === 'LineString') {
        lineStrings = [geometry.coordinates as number[][]];
      } else {
        skipped++;
        continue;
      }

      for (const coords of lineStrings) {
        if (!Array.isArray(coords) || coords.length < 2) {
          continue;
        }

        // Strip Z dimension - keep only X,Y (lon, lat)
        const coords2D = coords.map((c) => [c[0], c[1]]);

        const lineStringGeoJSON = JSON.stringify({
          type: 'LineString',
          coordinates: coords2D,
        });

        await prisma.$executeRawUnsafe(
          `INSERT INTO roads_named (namobj, geom)
           VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))`,
          namobj,
          lineStringGeoJSON,
        );

        inserted++;
      }

      if (inserted % 100 === 0 && inserted > 0) {
        console.log(`   ⏳ Inserted ${inserted} line segments...`);
      }
    } catch (error: any) {
      console.error(`   ⚠️  Error inserting: ${error.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Inserted ${inserted} line segments (skipped ${skipped})`);

  // ── Step 4: Create spatial index on staging table ──
  console.log('');
  console.log('📐 Creating spatial indices...');

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_roads_named_geom ON roads_named USING GIST (geom)`,
  );

  // Ensure main Road table also has a spatial index
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_road_geom ON "Road" USING GIST (geom)`,
  );

  console.log('   ✅ Spatial indices created');

  // ── Step 5: Count current unnamed roads ──
  const beforeCount = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "Road" WHERE name LIKE 'Road %'`,
  );
  console.log('');
  console.log(
    `📊 Roads with generic names (before): ${beforeCount[0].cnt}`,
  );

  // ── Step 6: Spatial join - enrich road names using ST_DWithin ──
  // Using 0.0001 degrees ≈ ~11 meters at the equator / ~10m at Bantul latitude
  console.log('');
  console.log('🔗 Performing spatial join (ST_DWithin ~10m threshold)...');

  const updateResult = await prisma.$executeRawUnsafe(`
    UPDATE "Road" r
    SET name = sub.namobj
    FROM (
      SELECT DISTINCT ON (r2.id)
        r2.id as road_id,
        rn.namobj
      FROM "Road" r2
      JOIN roads_named rn
        ON ST_DWithin(r2.geom, rn.geom, 0.0001)
      WHERE r2.name LIKE 'Road %'
      ORDER BY r2.id, ST_Distance(r2.geom, rn.geom) ASC
    ) sub
    WHERE r.id = sub.road_id
  `);

  console.log(`   ✅ Updated ${updateResult} roads with real names`);

  // ── Step 7: Fallback - ensure remaining roads keep a readable name ──
  console.log('');
  console.log('🏷️  Applying fallback names for unmatched roads...');

  const fallbackResult = await prisma.$executeRawUnsafe(`
    UPDATE "Road"
    SET name = CONCAT('Jalan Lokal #', id)
    WHERE name LIKE 'Road %'
  `);

  console.log(`   ✅ Applied fallback names to ${fallbackResult} roads`);

  // ── Step 8: Final statistics ──
  console.log('');
  console.log('📊 Final statistics:');

  const totalRoads = await prisma.road.count();
  const namedRoads = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "Road" WHERE name NOT LIKE 'Jalan Lokal #%'`,
  );
  const localRoads = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*) as cnt FROM "Road" WHERE name LIKE 'Jalan Lokal #%'`,
  );

  console.log(`   Total roads: ${totalRoads}`);
  console.log(`   Roads with real names: ${namedRoads[0].cnt}`);
  console.log(`   Roads with fallback names: ${localRoads[0].cnt}`);

  // Show some examples of enriched names
  const examples = await prisma.$queryRawUnsafe<any[]>(`
    SELECT name FROM "Road"
    WHERE name NOT LIKE 'Road %' AND name NOT LIKE 'Jalan Lokal #%'
    ORDER BY name
    LIMIT 15
  `);

  if (examples.length > 0) {
    console.log('');
    console.log('📝 Sample enriched road names:');
    examples.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.name}`);
    });
  }

  // ── Step 9: Clean up staging table ──
  console.log('');
  console.log('🧹 Cleaning up staging table...');
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS roads_named`);
  console.log('   ✅ Staging table dropped');

  // ── Step 10: Invalidate Redis cache ──
  console.log('');
  console.log('🔄 Note: Redis road-network cache may need manual invalidation.');
  console.log('   Restart the backend server to clear cached GeoJSON data.');

  console.log('');
  console.log('🎉 Road name enrichment completed successfully!');
}

enrichRoads()
  .catch((e) => {
    console.error('❌ Error during enrichment:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
