import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllRoads() {
  console.log('🔧 Memperbaiki SEMUA data jalan...\n');
  console.log('='.repeat(60));

  try {
    // STEP 1: Fix Length
    console.log('\n📏 STEP 1: Menghitung panjang jalan dari geometri...');
    const lengthResult = await prisma.$executeRaw`
      UPDATE "Road"
      SET length = ST_Length(geom::geography)
      WHERE geom IS NOT NULL
    `;
    console.log(`✅ ${lengthResult} jalan updated dengan length`);

    // STEP 2: Fix Topology
    console.log('\n🗺️  STEP 2: Membuat topology untuk routing...');
    console.log('   (Ini mungkin memakan waktu beberapa menit...)');

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
      console.log('⚠️  pgRouting belum terinstall, skip topology creation');
      console.log('   Routing akan menggunakan SimpleDijkstra service');
      console.log('   (SimpleDijkstra sudah bisa routing tanpa source/target)');
    }

    // STEP 3: Fix Safe Cost
    console.log('\n💰 STEP 3: Menghitung safe_cost untuk routing...');
    const costResult = await prisma.$executeRaw`
      UPDATE "Road"
      SET safe_cost = length * (1 + COALESCE("combinedHazard", 2) * 0.5)
      WHERE geom IS NOT NULL AND length IS NOT NULL
    `;
    console.log(`✅ ${costResult} jalan updated dengan safe_cost`);

    // STEP 4: Verify Results
    console.log('\n📊 STEP 4: Verifikasi hasil...');
    console.log('='.repeat(60));

    const stats = await prisma.$queryRaw<
      Array<{
        total: bigint;
        with_length: bigint;
        with_source: bigint;
        with_target: bigint;
        with_safe_cost: bigint;
        avg_length: number;
        avg_cost: number;
      }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT(length) as with_length,
        COUNT(source) as with_source,
        COUNT(target) as with_target,
        COUNT(safe_cost) as with_safe_cost,
        AVG(length) as avg_length,
        AVG(safe_cost) as avg_cost
      FROM "Road"
    `;

    if (stats.length > 0) {
      const stat = stats[0];
      const total = Number(stat.total);

      console.log('\n✅ HASIL AKHIR:');
      console.log(`  📊 Total jalan: ${stat.total}`);
      console.log(
        `  📏 Dengan length: ${stat.with_length} (${((Number(stat.with_length) / total) * 100).toFixed(2)}%)`,
      );
      console.log(
        `  🔗 Dengan source: ${stat.with_source} (${((Number(stat.with_source) / total) * 100).toFixed(2)}%)`,
      );
      console.log(
        `  🔗 Dengan target: ${stat.with_target} (${((Number(stat.with_target) / total) * 100).toFixed(2)}%)`,
      );
      console.log(
        `  💰 Dengan safe_cost: ${stat.with_safe_cost} (${((Number(stat.with_safe_cost) / total) * 100).toFixed(2)}%)`,
      );
      console.log(`  📐 Rata-rata panjang: ${stat.avg_length?.toFixed(2)} m`);
      console.log(`  💵 Rata-rata cost: ${stat.avg_cost?.toFixed(2)}`);

      // Check if all good
      const allGood =
        Number(stat.with_length) === total &&
        Number(stat.with_safe_cost) === total;

      console.log('\n' + '='.repeat(60));
      if (allGood) {
        console.log('✅ SEMUA DATA JALAN SUDAH DIPERBAIKI!');
      } else {
        console.log('⚠️  Masih ada data yang perlu diperbaiki:');
        if (Number(stat.with_length) < total) {
          console.log(
            `   - ${total - Number(stat.with_length)} jalan tanpa length`,
          );
        }
        if (Number(stat.with_safe_cost) < total) {
          console.log(
            `   - ${total - Number(stat.with_safe_cost)} jalan tanpa safe_cost`,
          );
        }
      }
    }

    console.log('\n✅ Perbaikan selesai!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllRoads();
