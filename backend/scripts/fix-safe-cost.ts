import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSafeCost() {
  console.log('🔧 Menghitung ulang safe_cost untuk routing...\n');

  try {
    // Calculate safe_cost based on combined hazard
    console.log('📊 Menghitung safe_cost dari combined hazard...');

    const result = await prisma.$executeRaw`
      UPDATE "Road"
      SET safe_cost = length * (1 + COALESCE("combinedHazard", 2) * 0.5)
      WHERE geom IS NOT NULL AND length IS NOT NULL
    `;

    console.log(`✅ Berhasil update ${result} jalan dengan safe_cost\n`);

    // Verify hasil
    const stats = await prisma.$queryRaw<
      Array<{
        total: bigint;
        with_safe_cost: bigint;
        min_cost: number;
        max_cost: number;
        avg_cost: number;
      }>
    >`
      SELECT 
        COUNT(*) as total,
        COUNT(safe_cost) as with_safe_cost,
        MIN(safe_cost) as min_cost,
        MAX(safe_cost) as max_cost,
        AVG(safe_cost) as avg_cost
      FROM "Road"
      WHERE safe_cost IS NOT NULL
    `;

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('📊 Statistik Safe Cost:');
      console.log(`  - Total jalan: ${stat.total}`);
      console.log(`  - Dengan safe_cost: ${stat.with_safe_cost}`);
      console.log(`  - Min cost: ${stat.min_cost?.toFixed(2)}`);
      console.log(`  - Max cost: ${stat.max_cost?.toFixed(2)}`);
      console.log(`  - Avg cost: ${stat.avg_cost?.toFixed(2)}`);
    }

    // Show sample calculations
    console.log('\n📝 Sample Calculations (5 jalan):');
    const samples = await prisma.road.findMany({
      take: 5,
      where: {
        safe_cost: { not: null },
      },
      select: {
        id: true,
        name: true,
        length: true,
        combinedHazard: true,
        safe_cost: true,
      },
    });

    samples.forEach((road, index) => {
      console.log(`\n  ${index + 1}. ${road.name || 'Unnamed'}`);
      console.log(`     Length: ${road.length?.toFixed(2)} m`);
      console.log(`     Combined Hazard: ${road.combinedHazard?.toFixed(2)}`);
      console.log(`     Safe Cost: ${road.safe_cost?.toFixed(2)}`);

      // Verify calculation
      if (road.length && road.combinedHazard && road.safe_cost) {
        const expected = road.length * (1 + road.combinedHazard * 0.5);
        const match = Math.abs(road.safe_cost - expected) < 0.01;
        console.log(
          `     Calculation: ${match ? '✅' : '❌'} ${expected.toFixed(2)}`,
        );
      }
    });

    console.log('\n✅ Perbaikan safe_cost selesai!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSafeCost();
