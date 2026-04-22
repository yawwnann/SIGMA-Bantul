import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AssignmentResult {
  totalRoads: number;
  assigned: number;
  defaulted: number;
  byRiskLevel: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
}

async function assignBpbdToRoads(): Promise<AssignmentResult> {
  console.log('🚀 Starting BPBD risk assignment to roads...\n');

  // Get total roads count
  const totalRoads = await prisma.road.count();
  console.log(`📊 Total roads in database: ${totalRoads}\n`);

  console.log('🔄 Step 1: Performing spatial join...');
  console.log('   This may take a while for large datasets...\n');

  // Perform spatial join to assign BPBD risk to roads
  // Roads intersecting multiple zones will get the highest risk level
  await prisma.$executeRaw`
    UPDATE "Road" r
    SET 
      "bpbdRiskLevel" = subquery."riskLevel",
      "bpbdRiskScore" = CASE 
        WHEN subquery."riskLevel" = 'LOW' THEN 1
        WHEN subquery."riskLevel" = 'MEDIUM' THEN 2
        WHEN subquery."riskLevel" = 'HIGH' THEN 3
        ELSE 1
      END,
      "updatedAt" = NOW()
    FROM (
      SELECT DISTINCT ON (r2.id)
        r2.id as road_id,
        brz."riskLevel"
      FROM "Road" r2
      JOIN "BpbdRiskZone" brz ON ST_Intersects(r2.geom, brz.geom)
      ORDER BY r2.id, 
        CASE brz."riskLevel"
          WHEN 'HIGH' THEN 3
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 1
        END DESC
    ) subquery
    WHERE r.id = subquery.road_id
  `;

  console.log('✅ Spatial join completed!\n');

  // Count assigned roads
  const assignedCount = await prisma.road.count({
    where: {
      bpbdRiskLevel: { not: null },
    },
  });

  console.log(`📍 Roads assigned with BPBD risk: ${assignedCount}`);

  // Set default LOW risk for roads not intersecting any zone
  console.log('\n🔄 Step 2: Setting default risk for unassigned roads...\n');

  await prisma.$executeRaw`
    UPDATE "Road"
    SET 
      "bpbdRiskLevel" = 'LOW',
      "bpbdRiskScore" = 1,
      "updatedAt" = NOW()
    WHERE "bpbdRiskLevel" IS NULL
  `;

  const defaultedCount = totalRoads - assignedCount;
  console.log(`✅ Set default LOW risk for ${defaultedCount} roads\n`);

  // Get statistics by risk level
  console.log('📊 Calculating statistics by risk level...\n');

  const lowCount = await prisma.road.count({
    where: { bpbdRiskLevel: 'LOW' },
  });

  const mediumCount = await prisma.road.count({
    where: { bpbdRiskLevel: 'MEDIUM' },
  });

  const highCount = await prisma.road.count({
    where: { bpbdRiskLevel: 'HIGH' },
  });

  // Calculate combined hazard scores
  console.log('🔄 Step 3: Calculating combined hazard scores...\n');

  await prisma.$executeRaw`
    UPDATE "Road"
    SET "combinedHazard" = (
      (CASE 
        WHEN vulnerability = 'LOW' THEN 1
        WHEN vulnerability = 'MEDIUM' THEN 2.5
        WHEN vulnerability = 'HIGH' THEN 4
        WHEN vulnerability = 'CRITICAL' THEN 5
        ELSE 2
      END * 0.5) + 
      (COALESCE("bpbdRiskScore", 1) * 0.5)
    )
    WHERE "bpbdRiskLevel" IS NOT NULL
  `;

  console.log('✅ Combined hazard scores calculated!\n');

  // Update safe_cost based on combined hazard
  console.log('🔄 Step 4: Updating routing costs...\n');

  await prisma.$executeRaw`
    UPDATE "Road"
    SET safe_cost = 
      COALESCE(length, 1) * (1 + COALESCE("combinedHazard", 2) * 0.5)
    WHERE geom IS NOT NULL AND "combinedHazard" IS NOT NULL
  `;

  console.log('✅ Routing costs updated!\n');

  const result: AssignmentResult = {
    totalRoads,
    assigned: assignedCount,
    defaulted: defaultedCount,
    byRiskLevel: {
      LOW: lowCount,
      MEDIUM: mediumCount,
      HIGH: highCount,
    },
  };

  // Print summary
  console.log('='.repeat(60));
  console.log('📈 Assignment Summary:');
  console.log('='.repeat(60));
  console.log(`Total roads: ${totalRoads}`);
  console.log(`Assigned via spatial join: ${assignedCount}`);
  console.log(`Defaulted to LOW: ${defaultedCount}`);
  console.log('\nRisk Level Distribution:');
  console.log(
    `  🟢 LOW: ${lowCount} (${((lowCount / totalRoads) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  🟡 MEDIUM: ${mediumCount} (${((mediumCount / totalRoads) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  🔴 HIGH: ${highCount} (${((highCount / totalRoads) * 100).toFixed(1)}%)`,
  );
  console.log('='.repeat(60) + '\n');

  return result;
}

// Main execution
assignBpbdToRoads()
  .then((result) => {
    console.log('✨ BPBD risk assignment completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Assignment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
