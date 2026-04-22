import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRoadConditions() {
  console.log('🔍 Memeriksa kondisi data jalan...\n');

  try {
    // 1. Total jalan
    const totalRoads = await prisma.road.count();
    console.log(`📊 Total Jalan: ${totalRoads}`);

    // 2. Kondisi jalan
    const conditionStats = await prisma.road.groupBy({
      by: ['condition'],
      _count: true,
    });

    console.log('\n📋 Distribusi Kondisi Jalan:');
    conditionStats.forEach((stat) => {
      const percentage = ((stat._count / totalRoads) * 100).toFixed(2);
      console.log(`  - ${stat.condition}: ${stat._count} (${percentage}%)`);
    });

    // 3. Vulnerability
    const vulnerabilityStats = await prisma.road.groupBy({
      by: ['vulnerability'],
      _count: true,
    });

    console.log('\n🔴 Distribusi Vulnerability:');
    vulnerabilityStats.forEach((stat) => {
      const percentage = ((stat._count / totalRoads) * 100).toFixed(2);
      console.log(`  - ${stat.vulnerability}: ${stat._count} (${percentage}%)`);
    });

    // 4. BPBD Risk Level
    const bpbdStats = await prisma.road.groupBy({
      by: ['bpbdRiskLevel'],
      _count: true,
    });

    console.log('\n🗺️  Distribusi BPBD Risk Level:');
    bpbdStats.forEach((stat) => {
      const percentage = ((stat._count / totalRoads) * 100).toFixed(2);
      const level = stat.bpbdRiskLevel || 'NULL';
      console.log(`  - ${level}: ${stat._count} (${percentage}%)`);
    });

    // 5. Jalan dengan geometri valid
    const geometryResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Road"
      WHERE geom IS NOT NULL
    `;
    const geometryCount = Number(geometryResult[0].count);

    console.log('\n🗺️  Geometri:');
    console.log(
      `  - Dengan geometri: ${geometryCount} (${((geometryCount / totalRoads) * 100).toFixed(2)}%)`,
    );
    console.log(
      `  - Tanpa geometri: ${totalRoads - geometryCount} (${(((totalRoads - geometryCount) / totalRoads) * 100).toFixed(2)}%)`,
    );

    // 6. Jalan dengan source/target (untuk routing)
    const routingResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Road"
      WHERE source IS NOT NULL AND target IS NOT NULL
    `;
    const routingCount = Number(routingResult[0].count);

    console.log('\n🔗 Routing Data:');
    console.log(
      `  - Dengan source/target: ${routingCount} (${((routingCount / totalRoads) * 100).toFixed(2)}%)`,
    );
    console.log(
      `  - Tanpa source/target: ${totalRoads - routingCount} (${(((totalRoads - routingCount) / totalRoads) * 100).toFixed(2)}%)`,
    );

    // 7. Combined Hazard statistics
    const hazardStats = await prisma.$queryRaw<
      Array<{ min: number; max: number; avg: number; count: bigint }>
    >`
      SELECT 
        MIN("combinedHazard") as min,
        MAX("combinedHazard") as max,
        AVG("combinedHazard") as avg,
        COUNT(*) as count
      FROM "Road"
      WHERE "combinedHazard" IS NOT NULL
    `;

    if (hazardStats.length > 0 && Number(hazardStats[0].count) > 0) {
      console.log('\n⚠️  Combined Hazard Score:');
      console.log(`  - Min: ${hazardStats[0].min?.toFixed(2)}`);
      console.log(`  - Max: ${hazardStats[0].max?.toFixed(2)}`);
      console.log(`  - Avg: ${hazardStats[0].avg?.toFixed(2)}`);
      console.log(`  - Count: ${hazardStats[0].count}`);
    }

    // 8. Sample data jalan
    console.log('\n📝 Sample Data (5 jalan pertama):');
    const sampleRoads = await prisma.road.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        condition: true,
        vulnerability: true,
        bpbdRiskLevel: true,
        bpbdRiskScore: true,
        combinedHazard: true,
        length: true,
      },
    });

    sampleRoads.forEach((road, index) => {
      console.log(
        `\n  ${index + 1}. ${road.name || 'Unnamed'} (ID: ${road.id})`,
      );
      console.log(`     Type: ${road.type}`);
      console.log(`     Condition: ${road.condition}`);
      console.log(`     Vulnerability: ${road.vulnerability}`);
      console.log(
        `     BPBD Risk: ${road.bpbdRiskLevel || 'NULL'} (Score: ${road.bpbdRiskScore || 'NULL'})`,
      );
      console.log(
        `     Combined Hazard: ${road.combinedHazard?.toFixed(2) || 'NULL'}`,
      );
      console.log(`     Length: ${road.length?.toFixed(2) || 'NULL'} m`);
    });

    // 9. Jalan dengan masalah potensial
    console.log('\n⚠️  Potensi Masalah:');

    const roadsWithoutBpbd = await prisma.road.count({
      where: { bpbdRiskLevel: null },
    });
    if (roadsWithoutBpbd > 0) {
      console.log(`  ⚠️  ${roadsWithoutBpbd} jalan tanpa BPBD risk level`);
    }

    const roadsWithoutHazard = await prisma.road.count({
      where: { combinedHazard: null },
    });
    if (roadsWithoutHazard > 0) {
      console.log(`  ⚠️  ${roadsWithoutHazard} jalan tanpa combined hazard`);
    }

    const roadsWithoutLength = await prisma.road.count({
      where: { length: null },
    });
    if (roadsWithoutLength > 0) {
      console.log(`  ⚠️  ${roadsWithoutLength} jalan tanpa length`);
    }

    const roadsWithoutName = await prisma.road.count({
      where: { name: null },
    });
    if (roadsWithoutName > 0) {
      console.log(`  ⚠️  ${roadsWithoutName} jalan tanpa nama`);
    }

    if (
      roadsWithoutBpbd === 0 &&
      roadsWithoutHazard === 0 &&
      roadsWithoutLength === 0 &&
      roadsWithoutName === 0
    ) {
      console.log('  ✅ Tidak ada masalah ditemukan!');
    }

    // 10. Summary
    console.log('\n✅ SUMMARY:');
    const allGood =
      geometryCount === totalRoads &&
      routingCount === totalRoads &&
      roadsWithoutBpbd === 0 &&
      roadsWithoutHazard === 0;

    if (allGood) {
      console.log('  ✅ Semua data jalan dalam kondisi BAIK!');
    } else {
      console.log('  ⚠️  Ada beberapa data yang perlu diperbaiki:');
      if (geometryCount < totalRoads) {
        console.log(
          `     - ${totalRoads - geometryCount} jalan tanpa geometri`,
        );
      }
      if (routingCount < totalRoads) {
        console.log(
          `     - ${totalRoads - routingCount} jalan tanpa source/target`,
        );
      }
      if (roadsWithoutBpbd > 0) {
        console.log(`     - ${roadsWithoutBpbd} jalan tanpa BPBD risk`);
      }
      if (roadsWithoutHazard > 0) {
        console.log(`     - ${roadsWithoutHazard} jalan tanpa combined hazard`);
      }
    }

    console.log('\n✅ Pemeriksaan selesai!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoadConditions();
