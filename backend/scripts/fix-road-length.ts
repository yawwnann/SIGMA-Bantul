import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoadLength() {
  console.log('🔧 Memperbaiki data length jalan...\n');

  try {
    // Update length dari geometri menggunakan ST_Length
    console.log('📏 Menghitung panjang jalan dari geometri...');

    const result = await prisma.$executeRaw`
      UPDATE "Road"
      SET length = ST_Length(geom::geography)
      WHERE geom IS NOT NULL AND length IS NULL
    `;

    console.log(`✅ Berhasil update ${result} jalan dengan data length\n`);

    // Verify hasil
    const stats = await prisma.$queryRaw<
      Array<{
        total: bigint;
        with_length: bigint;
        min_length: number;
        max_length: number;
        avg_length: number;
      }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT(length) as with_length,
        MIN(length) as min_length,
        MAX(length) as max_length,
        AVG(length) as avg_length
      FROM "Road"
    `;

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('📊 Statistik Length:');
      console.log(`  - Total jalan: ${stat.total}`);
      console.log(`  - Dengan length: ${stat.with_length}`);
      console.log(`  - Min length: ${stat.min_length?.toFixed(2)} m`);
      console.log(`  - Max length: ${stat.max_length?.toFixed(2)} m`);
      console.log(`  - Avg length: ${stat.avg_length?.toFixed(2)} m`);
    }

    console.log('\n✅ Perbaikan length selesai!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRoadLength();
