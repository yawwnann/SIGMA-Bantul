import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoadTopology() {
  console.log('🔧 Memperbaiki topology jalan untuk routing...\n');

  try {
    // 1. Add source and target columns if not exist (should already exist from migration)
    console.log('1️⃣ Checking source/target columns...');

    // 2. Create topology using pgRouting
    console.log('2️⃣ Creating road network topology...');
    console.log('   This may take a few minutes for 12,230 roads...\n');

    // Create topology with tolerance of 0.0001 degrees (~11 meters)
    const topologyResult = await prisma.$executeRaw`
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

    console.log(`✅ Topology created: ${topologyResult}\n`);

    // 3. Analyze the topology
    console.log('3️⃣ Analyzing topology...');

    const analyzeResult = await prisma.$executeRaw`
      SELECT pgr_analyzeGraph(
        'Road',
        0.0001,
        'geom',
        'id',
        'source',
        'target'
      )
    `;

    console.log(`✅ Topology analyzed: ${analyzeResult}\n`);

    // 4. Verify hasil
    console.log('4️⃣ Verifying results...');

    const stats = await prisma.$queryRaw<
      Array<{
        total: bigint;
        with_source: bigint;
        with_target: bigint;
        with_both: bigint;
      }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT(source) as with_source,
        COUNT(target) as with_target,
        COUNT(CASE WHEN source IS NOT NULL AND target IS NOT NULL THEN 1 END) as with_both
      FROM "Road"
    `;

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('📊 Statistik Topology:');
      console.log(`  - Total jalan: ${stat.total}`);
      console.log(`  - Dengan source: ${stat.with_source}`);
      console.log(`  - Dengan target: ${stat.with_target}`);
      console.log(`  - Dengan source & target: ${stat.with_both}`);

      const percentage = (Number(stat.with_both) / Number(stat.total)) * 100;
      console.log(`  - Persentase siap routing: ${percentage.toFixed(2)}%`);
    }

    // 5. Check for isolated roads
    const isolatedRoads = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Road"
      WHERE source IS NULL OR target IS NULL
    `;

    if (isolatedRoads.length > 0 && Number(isolatedRoads[0].count) > 0) {
      console.log(
        `\n⚠️  Warning: ${isolatedRoads[0].count} jalan terisolasi (tidak terhubung ke network)`,
      );
    }

    console.log('\n✅ Perbaikan topology selesai!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\n💡 Pastikan pgRouting extension sudah terinstall:');
    console.error('   CREATE EXTENSION IF NOT EXISTS pgrouting;');
  } finally {
    await prisma.$disconnect();
  }
}

fixRoadTopology();
