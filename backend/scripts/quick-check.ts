import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickCheck() {
  console.log('🔍 Quick Check Data Jalan...\n');

  try {
    const stats = await prisma.$queryRaw<
      Array<{
        total: bigint;
        with_length: bigint;
        with_safe_cost: bigint;
        with_bpbd: bigint;
        with_hazard: bigint;
        avg_length: number;
        avg_cost: number;
      }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT(length) as with_length,
        COUNT(safe_cost) as with_safe_cost,
        COUNT("bpbdRiskLevel") as with_bpbd,
        COUNT("combinedHazard") as with_hazard,
        AVG(length) as avg_length,
        AVG(safe_cost) as avg_cost
      FROM "Road"
    `;

    if (stats.length > 0) {
      const stat = stats[0];
      const total = Number(stat.total);

      console.log('✅ HASIL:');
      console.log(`  📊 Total jalan: ${stat.total}`);
      console.log(
        `  📏 Dengan length: ${stat.with_length} (${((Number(stat.with_length) / total) * 100).toFixed(2)}%)`,
      );
      console.log(
        `  💰 Dengan safe_cost: ${stat.with_safe_cost} (${((Number(stat.with_safe_cost) / total) * 100).toFixed(2)}%)`,
      );
      console.log(
        `  🗺️  Dengan BPBD: ${stat.with_bpbd} (${((Number(stat.with_bpbd) / total) * 100).toFixed(2)}%)`,
      );
      console.log(
        `  ⚠️  Dengan hazard: ${stat.with_hazard} (${((Number(stat.with_hazard) / total) * 100).toFixed(2)}%)`,
      );
      console.log(`  📐 Rata-rata panjang: ${stat.avg_length?.toFixed(2)} m`);
      console.log(`  💵 Rata-rata cost: ${stat.avg_cost?.toFixed(2)}`);
    }

    // Sample data
    console.log('\n📝 Sample Data (3 jalan):');
    const samples = await prisma.road.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        length: true,
        safe_cost: true,
        bpbdRiskLevel: true,
        combinedHazard: true,
      },
    });

    samples.forEach((road, index) => {
      console.log(`\n  ${index + 1}. ${road.name || 'Unnamed'}`);
      console.log(`     Length: ${road.length?.toFixed(2)} m`);
      console.log(`     Safe Cost: ${road.safe_cost?.toFixed(2)}`);
      console.log(`     BPBD Risk: ${road.bpbdRiskLevel}`);
      console.log(`     Combined Hazard: ${road.combinedHazard?.toFixed(2)}`);
    });

    console.log('\n✅ Selesai!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
