/**
 * Precompute simplified geometry for all roads
 * Run this once to populate the geom_simplified column
 *
 * Usage: npx ts-node scripts/precompute-simplified-geom.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SIMPLIFY_TOLERANCE = 0.00005; // ~5.5 meters at equator

async function precomputeSimplifiedGeometry() {
  console.log('🚀 Memulai precompute simplified geometry...\n');
  console.log(`📐 Tolerance: ${SIMPLIFY_TOLERANCE} degrees (~5.5 meters)\n`);

  try {
    // Check if column exists
    console.log('🔍 Mengecek kolom geom_simplified...');
    const columnCheck = await prisma.$queryRaw<any[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Road' AND column_name = 'geom_simplified'
    `;

    if (columnCheck.length === 0) {
      console.log('⚠️ Kolom geom_simplified belum ada. Jalankan migration terlebih dahulu:');
      console.log('   npx prisma migrate deploy');
      console.log('\nAtau eksekusi SQL manual di VPS:');
      console.log(`
ALTER TABLE "Road" ADD COLUMN IF NOT EXISTS geom_simplified geometry(LineString, 4326);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Road_geom_simplified_gist_idx" ON "Road" USING GIST (geom_simplified);
      `);
      return;
    }

    console.log('✅ Kolom geom_simplified tersedia\n');

    // Count roads
    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*)::int as total FROM "Road" WHERE geom IS NOT NULL
    `;
    const totalRoads = Number(countResult[0]?.total || 0);
    console.log(`📊 Total roads dengan geometri: ${totalRoads}\n`);

    // Batch update untuk menghindari memory issues
    // PostgreSQL doesn't support LIMIT in UPDATE, so we use ctid
    const BATCH_SIZE = 5000;
    let processed = 0;
    let updated = 0;

    while (true) {
      // Get ctid of rows to update (using subquery approach)
      const updateResult = await prisma.$executeRawUnsafe(`
        UPDATE "Road"
        SET geom_simplified = ST_SimplifyPreserveTopology(geom, ${SIMPLIFY_TOLERANCE})
        WHERE ctid IN (
          SELECT ctid FROM "Road"
          WHERE geom IS NOT NULL AND geom_simplified IS NULL
          LIMIT ${BATCH_SIZE}
        )
      `);

      if (updateResult === 0) {
        console.log('📦 Tidak ada baris yang perlu diupdate. Selesai!');
        break;
      }

      updated += updateResult;
      processed += updateResult;

      const progress = ((processed / totalRoads) * 100).toFixed(1);
      console.log(`📈 Progress: ${processed}/${totalRoads} (${progress}%) - Updated: ${updated} rows`);

      // Small delay untuk tidak membebani database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify results
    console.log('\n📊 Verifikasi hasil:');
    const stats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int as total,
        COUNT(geom_simplified)::int as with_simplified,
        COUNT(geom)::int as with_geom
      FROM "Road"
    `;

    if (stats.length > 0) {
      const stat = stats[0];
      console.log(`  - Total roads: ${stat.total}`);
      console.log(`  - Dengan geom_simplified: ${stat.with_simplified}`);
      console.log(`  - Dengan geom: ${stat.with_geom}`);
    }

    console.log('\n🎉 Precompute simplified geometry selesai!');
    console.log('\n📌 Langkah selanjutnya:');
    console.log('1. Flush Redis cache: POST /api/roads/invalidate-cache');
    console.log('2. Test API: GET /api/roads/network?minLat=-8.05&maxLat=-7.75&minLon=110.15&maxLon=110.55');
    console.log('3. Cek performance - seharusnya < 3 detik');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

precomputeSimplifiedGeometry()
  .then(() => {
    console.log('\n✅ Script selesai');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script gagal:', error);
    process.exit(1);
  });