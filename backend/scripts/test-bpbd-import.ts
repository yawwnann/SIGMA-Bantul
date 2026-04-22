import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testImport() {
  console.log('🧪 Testing BPBD import with sample data...\n');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Check if table exists and is empty
    const count = await prisma.bpbdRiskZone.count();
    console.log(`📊 Current BPBD zones in database: ${count}\n`);

    if (count === 0) {
      console.log('📝 Inserting test zone...\n');

      // Insert a test zone using Prisma (not raw SQL)
      const testZone = await prisma.bpbdRiskZone.create({
        data: {
          kecamatan: 'Kasihan',
          desa: 'Ngestiharjo',
          name: 'Kasihan - Ngestiharjo',
          riskLevel: 'LOW',
          bahaya: 'Rendah',
          iaGempa: 1,
          taGempa: 4,
          tRisk: 5.0,
          skorTRisk: 3.0,
          kodeDesa: 2150004.0,
          kodeKec: 3402150,
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [110.34180970413469, -7.813429470916081],
                  [110.341810000090433, -7.813419999428137],
                  [110.341810000115586, -7.813419999482613],
                  [110.34180970413469, -7.813429470916081],
                ],
              ],
            ],
          },
          area: 0.1,
        },
      });

      console.log(`✅ Test zone created with ID: ${testZone.id}\n`);
    }

    // Check road count
    const roadCount = await prisma.road.count();
    console.log(`📊 Total roads in database: ${roadCount}\n`);

    // Check if roads have BPBD fields
    const roadsWithBpbd = await prisma.road.count({
      where: {
        bpbdRiskLevel: { not: null },
      },
    });

    console.log(`📊 Roads with BPBD risk assigned: ${roadsWithBpbd}\n`);

    console.log('✨ Test completed successfully!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testImport();
