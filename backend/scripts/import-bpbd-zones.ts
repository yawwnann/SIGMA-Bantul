import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ImportResult {
  imported: number;
  errors: number;
  total: number;
  details: Array<{ name: string; riskLevel: string; error?: string }>;
}

async function importBpbdZones(): Promise<ImportResult> {
  console.log('🚀 Starting BPBD risk zones import...\n');

  const geoJsonPath = path.join(
    process.cwd(),
    'Data',
    'GeoJSon',
    'Data Wilayah dengan tingkat resiko gempa.geojson',
  );

  console.log(`📂 Reading GeoJSON from: ${geoJsonPath}`);

  if (!fs.existsSync(geoJsonPath)) {
    throw new Error(`GeoJSON file not found: ${geoJsonPath}`);
  }

  const fileData = fs.readFileSync(geoJsonPath, 'utf-8');
  const geojson = JSON.parse(fileData);

  if (!geojson.features || !Array.isArray(geojson.features)) {
    throw new Error('Invalid GeoJSON format: missing features array');
  }

  console.log(`📊 Found ${geojson.features.length} features to import\n`);

  // Debug: Check first few features
  console.log('🔍 Debugging first 3 features:');
  for (let i = 0; i < Math.min(3, geojson.features.length); i++) {
    const props = geojson.features[i].properties;
    console.log(`Feature ${i + 1}:`, {
      kecamatan: props.kecamatan,
      desa: props.desa,
      bahaya: props.bahaya,
      hasAllFields: !!(props.kecamatan && props.desa && props.bahaya),
    });
  }
  console.log();

  let imported = 0;
  let errors = 0;
  let skipped = 0;
  const details: Array<{ name: string; riskLevel: string; error?: string }> =
    [];

  for (const feature of geojson.features) {
    try {
      const props = feature.properties;

      // Skip features without required fields
      if (!props.kecamatan || !props.desa || !props.bahaya) {
        skipped++;
        // Silently skip - these are likely small polygon fragments
        continue;
      }

      // Also skip if any of the required fields are empty strings
      if (
        props.kecamatan.trim() === '' ||
        props.desa.trim() === '' ||
        props.bahaya.trim() === ''
      ) {
        skipped++;
        continue;
      }

      const riskLevel = mapRiskLevel(props.bahaya);
      const name = `${props.kecamatan} - ${props.desa}`;

      // Check if this zone already exists (avoid duplicates)
      const existing = await prisma.bpbdRiskZone.findFirst({
        where: {
          kecamatan: props.kecamatan,
          desa: props.desa,
        },
      });

      if (existing) {
        skipped++;
        // Skip duplicate - we only want one record per kecamatan-desa combination
        continue;
      }

      // Insert using raw SQL to handle PostGIS geometry
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
          ${props.kecamatan},
          ${props.desa},
          ${name},
          ${riskLevel}::"BpbdRiskLevel",
          ${props.bahaya},
          ${props.ia_gempa || null},
          ${props.ta_gempa || null},
          ${props.trisk || null},
          ${props.skor_trisk || null},
          ${props.kode_desa || null},
          ${props.kode_kec || null},
          ${JSON.stringify(feature.geometry)}::jsonb,
          ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}),
          ST_Area(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)})::geography) / 1000000,
          NOW(),
          NOW()
        )
      `;

      imported++;
      console.log(`✅ Imported: ${name} (${riskLevel})`);
    } catch (error) {
      errors++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const name = feature.properties?.kecamatan
        ? `${feature.properties.kecamatan} - ${feature.properties.desa}`
        : 'Unknown';
      details.push({ name, riskLevel: 'ERROR', error: errorMsg });
      console.error(`❌ Error importing ${name}:`, errorMsg);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`⏭️  Skipped (missing data/duplicates): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total features: ${geojson.features.length}`);
  console.log('='.repeat(60) + '\n');

  return {
    imported,
    errors,
    total: geojson.features.length,
    details,
  };
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

  // Default to LOW for 'rendah' or any other value
  return 'LOW';
}

// Main execution
importBpbdZones()
  .then((result) => {
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
