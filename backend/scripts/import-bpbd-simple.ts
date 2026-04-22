import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importBpbdZones() {
  console.log('🚀 Starting BPBD risk zones import (simple version)...\n');

  const geoJsonPath = path.join(
    process.cwd(),
    'Data',
    'GeoJSon',
    'Data Wilayah dengan tingkat resiko gempa.geojson',
  );

  const fileData = fs.readFileSync(geoJsonPath, 'utf-8');
  const geojson = JSON.parse(fileData);

  console.log(`📊 Found ${geojson.features.length} features\n`);

  // Group features by kecamatan + desa to find unique zones
  const uniqueZones = new Map();

  for (const feature of geojson.features) {
    const props = feature.properties;

    if (!props.kecamatan || !props.desa || !props.bahaya) {
      continue;
    }

    const key = `${props.kecamatan}-${props.desa}`;

    if (!uniqueZones.has(key)) {
      uniqueZones.set(key, {
        kecamatan: props.kecamatan,
        desa: props.desa,
        bahaya: props.bahaya,
        geometry: feature.geometry,
        props: props,
      });
    }
  }

  console.log(`📍 Found ${uniqueZones.size} unique zones\n`);

  let imported = 0;
  let errors = 0;

  for (const [key, zone] of uniqueZones) {
    try {
      const riskLevel = mapRiskLevel(zone.bahaya);
      const name = `${zone.kecamatan} - ${zone.desa}`;

      // Check if already exists
      const existing = await prisma.bpbdRiskZone.findFirst({
        where: {
          kecamatan: zone.kecamatan,
          desa: zone.desa,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping existing: ${name}`);
        continue;
      }

      // Insert using raw SQL
      await prisma.$executeRaw`
        INSERT INTO "BpbdRiskZone" (
          kecamatan,
          desa,
          name,
          "riskLevel",
          bahaya,
          "iaGempa",
          "taGempa",
          "tRisk",
          "skorTRisk",
          "kodeDesa",
          "kodeKec",
          geometry,
          geom,
          area,
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${zone.kecamatan},
          ${zone.desa},
          ${name},
          ${riskLevel}::"BpbdRiskLevel",
          ${zone.bahaya},
          ${zone.props.ia_gempa || null},
          ${zone.props.ta_gempa || null},
          ${zone.props.trisk || null},
          ${zone.props.skor_trisk || null},
          ${zone.props.kode_desa || null},
          ${zone.props.kode_kec || null},
          ${JSON.stringify(zone.geometry)}::jsonb,
          ST_GeomFromGeoJSON(${JSON.stringify(zone.geometry)}),
          ST_Area(ST_GeomFromGeoJSON(${JSON.stringify(zone.geometry)})::geography) / 1000000,
          NOW(),
          NOW()
        )
      `;

      imported++;
      console.log(`✅ Imported: ${name} (${riskLevel})`);
    } catch (error) {
      errors++;
      console.error(`❌ Error importing ${key}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Unique zones found: ${uniqueZones.size}`);
  console.log('='.repeat(60) + '\n');
}

function mapRiskLevel(bahaya: string): string {
  const lower = bahaya?.toLowerCase() || '';

  if (lower.includes('tinggi') || lower.includes('high')) {
    return 'HIGH';
  }

  if (
    lower.includes('sedang') ||
    lower.includes('medium') ||
    lower.includes('menengah')
  ) {
    return 'MEDIUM';
  }

  return 'LOW';
}

// Main execution
importBpbdZones()
  .then(() => {
    console.log('✨ Import completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
