import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');

    // Test basic query
    const count = await prisma.road.count();
    console.log(`✅ Connected! Found ${count} roads in database`);

    // Test if BpbdRiskZone table exists
    const zoneCount = await prisma.bpbdRiskZone.count();
    console.log(`✅ BpbdRiskZone table exists! Found ${zoneCount} zones`);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
