import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  totalZones: number;
  totalRoads: number;
  roadsWithBpbdRisk: number;
  roadsWithoutBpbdRisk: number;
  geometryValidation: {
    validZones: number;
    invalidZones: number;
  };
  riskDistribution: {
    zones: { LOW: number; MEDIUM: number; HIGH: number };
    roads: { LOW: number; MEDIUM: number; HIGH: number };
  };
  spatialJoinCompleteness: {
    percentage: number;
    status: 'complete' | 'incomplete';
  };
  correlationAnalysis: {
    highRiskZonesCount: number;
    highVulnerabilityRoadsCount: number;
    overlap: number;
  };
}

async function validateBpbdData(): Promise<ValidationResult> {
  console.log('🔍 Starting BPBD Data Validation...\n');

  // 1. Count zones and roads
  console.log('📊 Counting zones and roads...');
  const totalZones = await prisma.bpbdRiskZone.count();
  const totalRoads = await prisma.road.count();
  const roadsWithBpbdRisk = await prisma.road.count({
    where: { bpbdRiskLevel: { not: null } },
  });
  const roadsWithoutBpbdRisk = totalRoads - roadsWithBpbdRisk;

  console.log(`  ✓ Total BPBD Zones: ${totalZones}`);
  console.log(`  ✓ Total Roads: ${totalRoads}`);
  console.log(`  ✓ Roads with BPBD Risk: ${roadsWithBpbdRisk}`);
  console.log(`  ✓ Roads without BPBD Risk: ${roadsWithoutBpbdRisk}\n`);

  // 2. Validate geometries
  console.log('🗺️  Validating geometries...');
  const invalidZones = await prisma.$queryRaw<any[]>`
    SELECT id, name, kecamatan, desa
    FROM "BpbdRiskZone"
    WHERE NOT ST_IsValid(geom)
  `;

  const validZones = totalZones - invalidZones.length;
  console.log(`  ✓ Valid Zones: ${validZones}`);
  console.log(`  ✓ Invalid Zones: ${invalidZones.length}`);

  if (invalidZones.length > 0) {
    console.log('  ⚠️  Invalid zones found:');
    invalidZones.forEach((zone) => {
      console.log(`     - ${zone.name} (${zone.kecamatan}, ${zone.desa})`);
    });
  }
  console.log('');

  // 3. Risk distribution
  console.log('📈 Analyzing risk distribution...');
  const zonesByRisk = await prisma.bpbdRiskZone.groupBy({
    by: ['riskLevel'],
    _count: true,
  });

  const roadsByRisk = await prisma.road.groupBy({
    by: ['bpbdRiskLevel'],
    _count: true,
    where: { bpbdRiskLevel: { not: null } },
  });

  const zonesDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  zonesByRisk.forEach((item) => {
    if (item.riskLevel) {
      zonesDistribution[item.riskLevel] = item._count;
    }
  });

  const roadsDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  roadsByRisk.forEach((item) => {
    if (item.bpbdRiskLevel) {
      roadsDistribution[item.bpbdRiskLevel] = item._count;
    }
  });

  console.log('  Zones Distribution:');
  console.log(`    - LOW: ${zonesDistribution.LOW}`);
  console.log(`    - MEDIUM: ${zonesDistribution.MEDIUM}`);
  console.log(`    - HIGH: ${zonesDistribution.HIGH}`);
  console.log('  Roads Distribution:');
  console.log(`    - LOW: ${roadsDistribution.LOW}`);
  console.log(`    - MEDIUM: ${roadsDistribution.MEDIUM}`);
  console.log(`    - HIGH: ${roadsDistribution.HIGH}\n`);

  // 4. Spatial join completeness
  console.log('🔗 Checking spatial join completeness...');
  const completenessPercentage = (roadsWithBpbdRisk / totalRoads) * 100;
  const completenessStatus =
    completenessPercentage === 100 ? 'complete' : 'incomplete';

  console.log(`  ✓ Completeness: ${completenessPercentage.toFixed(2)}%`);
  console.log(`  ✓ Status: ${completenessStatus}\n`);

  // 5. Correlation analysis (BPBD vs Frequency)
  console.log('🔬 Analyzing correlation between BPBD and frequency data...');
  const highRiskZones = await prisma.bpbdRiskZone.count({
    where: { riskLevel: 'HIGH' },
  });

  const highVulnerabilityRoads = await prisma.road.count({
    where: { vulnerability: 'HIGH' },
  });

  // Count roads with both HIGH BPBD risk and HIGH vulnerability
  const overlap = await prisma.road.count({
    where: {
      bpbdRiskLevel: 'HIGH',
      vulnerability: 'HIGH',
    },
  });

  console.log(`  ✓ High Risk Zones (BPBD): ${highRiskZones}`);
  console.log(
    `  ✓ High Vulnerability Roads (Frequency): ${highVulnerabilityRoads}`,
  );
  console.log(`  ✓ Overlap (Both HIGH): ${overlap}`);

  if (highVulnerabilityRoads > 0) {
    const overlapPercentage = (overlap / highVulnerabilityRoads) * 100;
    console.log(`  ✓ Overlap Percentage: ${overlapPercentage.toFixed(2)}%\n`);
  } else {
    console.log('  ⚠️  No high vulnerability roads found\n');
  }

  // 6. Check for disagreements
  console.log('⚠️  Checking for disagreements...');
  const disagreements = await prisma.$queryRaw<any[]>`
    SELECT 
      r.id,
      r.name,
      r.vulnerability as frequency_risk,
      r."bpbdRiskLevel" as bpbd_risk,
      r."combinedHazard"
    FROM "Road" r
    WHERE 
      (r.vulnerability = 'HIGH' AND r."bpbdRiskLevel" = 'LOW')
      OR (r.vulnerability = 'LOW' AND r."bpbdRiskLevel" = 'HIGH')
    LIMIT 10
  `;

  if (disagreements.length > 0) {
    console.log(
      `  ⚠️  Found ${disagreements.length} disagreements (showing first 10):`,
    );
    disagreements.forEach((road) => {
      console.log(
        `     - ${road.name}: Frequency=${road.frequency_risk}, BPBD=${road.bpbd_risk}`,
      );
    });
  } else {
    console.log('  ✓ No major disagreements found');
  }
  console.log('');

  // 7. Combined hazard validation
  console.log('🧮 Validating combined hazard scores...');
  const roadsWithCombinedHazard = await prisma.road.count({
    where: { combinedHazard: { not: null } },
  });

  const combinedHazardStats = await prisma.$queryRaw<any[]>`
    SELECT 
      MIN("combinedHazard") as min_hazard,
      MAX("combinedHazard") as max_hazard,
      AVG("combinedHazard") as avg_hazard
    FROM "Road"
    WHERE "combinedHazard" IS NOT NULL
  `;

  console.log(`  ✓ Roads with Combined Hazard: ${roadsWithCombinedHazard}`);
  if (combinedHazardStats.length > 0) {
    const stats = combinedHazardStats[0];
    console.log(
      `  ✓ Min Combined Hazard: ${Number(stats.min_hazard).toFixed(2)}`,
    );
    console.log(
      `  ✓ Max Combined Hazard: ${Number(stats.max_hazard).toFixed(2)}`,
    );
    console.log(
      `  ✓ Avg Combined Hazard: ${Number(stats.avg_hazard).toFixed(2)}`,
    );
  }
  console.log('');

  // Summary
  console.log('📋 Validation Summary:');
  console.log('='.repeat(50));

  const result: ValidationResult = {
    totalZones,
    totalRoads,
    roadsWithBpbdRisk,
    roadsWithoutBpbdRisk,
    geometryValidation: {
      validZones,
      invalidZones: invalidZones.length,
    },
    riskDistribution: {
      zones: zonesDistribution,
      roads: roadsDistribution,
    },
    spatialJoinCompleteness: {
      percentage: completenessPercentage,
      status: completenessStatus,
    },
    correlationAnalysis: {
      highRiskZonesCount: highRiskZones,
      highVulnerabilityRoadsCount: highVulnerabilityRoads,
      overlap,
    },
  };

  // Status checks
  const issues: string[] = [];

  if (totalZones === 0) {
    issues.push('❌ No BPBD zones imported');
  } else {
    console.log('✅ BPBD zones imported successfully');
  }

  if (roadsWithoutBpbdRisk > 0) {
    issues.push(
      `⚠️  ${roadsWithoutBpbdRisk} roads without BPBD risk assignment`,
    );
  } else {
    console.log('✅ All roads have BPBD risk assignment');
  }

  if (invalidZones.length > 0) {
    issues.push(`⚠️  ${invalidZones.length} zones with invalid geometries`);
  } else {
    console.log('✅ All zone geometries are valid');
  }

  if (completenessPercentage < 100) {
    issues.push(
      `⚠️  Spatial join incomplete (${completenessPercentage.toFixed(2)}%)`,
    );
  } else {
    console.log('✅ Spatial join complete');
  }

  if (roadsWithCombinedHazard < totalRoads) {
    issues.push(
      `⚠️  ${totalRoads - roadsWithCombinedHazard} roads without combined hazard`,
    );
  } else {
    console.log('✅ All roads have combined hazard scores');
  }

  console.log('');

  if (issues.length > 0) {
    console.log('⚠️  Issues Found:');
    issues.forEach((issue) => console.log(`  ${issue}`));
  } else {
    console.log('🎉 All validation checks passed!');
  }

  console.log('='.repeat(50));

  return result;
}

async function main() {
  try {
    const result = await validateBpbdData();

    // Save validation report
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'validation-report.json');

    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Validation report saved to: ${reportPath}`);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
