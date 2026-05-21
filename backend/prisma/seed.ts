import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  // NOTE: 'Road' table is intentionally excluded here.
  // Road data is managed separately via 'npm run db:import-roads' + 'npm run db:enrich-roads'.
  // Truncating it here would wipe the 12,000+ imported road segments.
  console.log('🗑️  Clearing existing data and resetting ID counters...');
  const tableNames = [
    'EvacuationRoute',
    'PublicFacility',
    'HazardZone',
    'Earthquake',
    'User',
  ];

  for (const tableName of tableNames) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`,
    );
  }

  // 1. Create Users
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@bantul.go.id',
      password: hashedPassword,
      name: 'Admin BPBD Bantul',
      role: 'ADMIN',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@bantul.go.id',
      password: hashedPassword,
      name: 'Operator BPBD',
      role: 'USER',
    },
  });

  // Create EvacuationLocation Officers with Indonesian names
  const officers = [
    {
      email: 'ahmad.fauzi@bantul.go.id',
      name: 'Ahmad Fauzi',
    },
    {
      email: 'siti.nurhaliza@bantul.go.id',
      name: 'Siti Nurhaliza',
    },
    {
      email: 'budi.santoso@bantul.go.id',
      name: 'Budi Santoso',
    },
    {
      email: 'dewi.lestari@bantul.go.id',
      name: 'Dewi Lestari',
    },
    {
      email: 'eko.prasetyo@bantul.go.id',
      name: 'Eko Prasetyo',
    },
    {
      email: 'fitri.handayani@bantul.go.id',
      name: 'Fitri Handayani',
    },
    {
      email: 'gunawan.wijaya@bantul.go.id',
      name: 'Gunawan Wijaya',
    },
    {
      email: 'hesti.rahmawati@bantul.go.id',
      name: 'Hesti Rahmawati',
    },
    {
      email: 'indra.kusuma@bantul.go.id',
      name: 'Indra Kusuma',
    },
    {
      email: 'joko.widodo@bantul.go.id',
      name: 'Joko Widodo',
    },
    {
      email: 'kartika.sari@bantul.go.id',
      name: 'Kartika Sari',
    },
    {
      email: 'lukman.hakim@bantul.go.id',
      name: 'Lukman Hakim',
    },
    {
      email: 'maya.anggraini@bantul.go.id',
      name: 'Maya Anggraini',
    },
    {
      email: 'nugroho.susanto@bantul.go.id',
      name: 'Nugroho Susanto',
    },
    {
      email: 'putri.wulandari@bantul.go.id',
      name: 'Putri Wulandari',
    },
  ];

  const createdOfficers = [];
  for (const officer of officers) {
    const created = await prisma.user.create({
      data: {
        email: officer.email,
        password: hashedPassword,
        name: officer.name,
        role: 'EVACUATION_LOCATION_OFFICER',
      },
    });
    createdOfficers.push(created);
  }

  console.log(
    `✅ Created ${4 + officers.length} users (1 admin, 1 user, ${officers.length} officers)`,
  );

  // 2. Create Earthquakes (30 historical earthquakes in Bantul area)
  console.log('🌍 Creating earthquake records...');

  const earthquakes = [
    // Recent earthquakes (2024-2026)
    {
      magnitude: 5.2,
      depth: 10,
      lat: -7.8876,
      lon: 110.3306,
      location: 'Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-04-15T08:30:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.8,
      depth: 15,
      lat: -7.9123,
      lon: 110.3567,
      location: 'Imogiri, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-04-10T14:20:00Z'),
      dirasakan: 'Dirasakan (Skala MMI II)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 3.9,
      depth: 8,
      lat: -7.8654,
      lon: 110.389,
      location: 'Banguntapan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-04-05T03:15:00Z'),
      dirasakan: 'Tidak dirasakan',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.5,
      depth: 12,
      lat: -7.9345,
      lon: 110.3123,
      location: 'Srandakan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-03-28T19:45:00Z'),
      dirasakan: 'Dirasakan (Skala MMI IV)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.2,
      depth: 20,
      lat: -7.8789,
      lon: 110.3445,
      location: 'Sewon, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-03-20T11:30:00Z'),
      dirasakan: 'Dirasakan (Skala MMI II)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.8,
      depth: 10,
      lat: -7.9012,
      lon: 110.3678,
      location: 'Pleret, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-03-12T06:20:00Z'),
      dirasakan: 'Dirasakan (Skala MMI V)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.5,
      depth: 18,
      lat: -7.8567,
      lon: 110.3234,
      location: 'Kasihan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-03-05T22:10:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 3.7,
      depth: 25,
      lat: -7.9234,
      lon: 110.3456,
      location: 'Piyungan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-02-28T15:40:00Z'),
      dirasakan: 'Tidak dirasakan',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.1,
      depth: 14,
      lat: -7.889,
      lon: 110.3789,
      location: 'Banguntapan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-02-20T09:25:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.9,
      depth: 16,
      lat: -7.9456,
      lon: 110.3012,
      location: 'Kretek, Bantul',
      region: 'Yogyakarta',
      time: new Date('2026-02-10T18:50:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    // 2025 earthquakes
    {
      magnitude: 5.3,
      depth: 11,
      lat: -7.8723,
      lon: 110.3567,
      location: 'Sewon, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-12-15T07:30:00Z'),
      dirasakan: 'Dirasakan (Skala MMI IV)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.6,
      depth: 19,
      lat: -7.9123,
      lon: 110.389,
      location: 'Imogiri, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-11-20T13:15:00Z'),
      dirasakan: 'Dirasakan (Skala MMI II)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 3.8,
      depth: 22,
      lat: -7.8567,
      lon: 110.3123,
      location: 'Kasihan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-10-25T20:40:00Z'),
      dirasakan: 'Tidak dirasakan',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.6,
      depth: 9,
      lat: -7.9345,
      lon: 110.3678,
      location: 'Pleret, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-09-30T04:20:00Z'),
      dirasakan: 'Dirasakan (Skala MMI V)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.3,
      depth: 17,
      lat: -7.889,
      lon: 110.3234,
      location: 'Sewon, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-08-18T16:55:00Z'),
      dirasakan: 'Dirasakan (Skala MMI II)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.0,
      depth: 13,
      lat: -7.9012,
      lon: 110.3456,
      location: 'Piyungan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-07-22T10:30:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.7,
      depth: 21,
      lat: -7.8654,
      lon: 110.3789,
      location: 'Banguntapan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-06-15T23:10:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 3.9,
      depth: 24,
      lat: -7.9234,
      lon: 110.3012,
      location: 'Kretek, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-05-10T12:45:00Z'),
      dirasakan: 'Tidak dirasakan',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.4,
      depth: 10,
      lat: -7.8876,
      lon: 110.3567,
      location: 'Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-04-05T08:20:00Z'),
      dirasakan: 'Dirasakan (Skala MMI IV)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.4,
      depth: 15,
      lat: -7.9456,
      lon: 110.3345,
      location: 'Srandakan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2025-03-01T19:35:00Z'),
      dirasakan: 'Dirasakan (Skala MMI II)',
      potential: 'Tidak berpotensi tsunami',
    },
    // 2024 earthquakes
    {
      magnitude: 5.7,
      depth: 8,
      lat: -7.8723,
      lon: 110.389,
      location: 'Banguntapan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-12-20T05:15:00Z'),
      dirasakan: 'Dirasakan (Skala MMI V)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.1,
      depth: 20,
      lat: -7.9123,
      lon: 110.3123,
      location: 'Imogiri, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-11-15T14:50:00Z'),
      dirasakan: 'Dirasakan (Skala MMI II)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.8,
      depth: 12,
      lat: -7.8567,
      lon: 110.3678,
      location: 'Kasihan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-10-10T21:25:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.2,
      depth: 16,
      lat: -7.9345,
      lon: 110.3234,
      location: 'Pleret, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-09-05T11:40:00Z'),
      dirasakan: 'Dirasakan (Skala MMI IV)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 3.6,
      depth: 23,
      lat: -7.889,
      lon: 110.3456,
      location: 'Sewon, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-08-01T17:20:00Z'),
      dirasakan: 'Tidak dirasakan',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.9,
      depth: 14,
      lat: -7.9012,
      lon: 110.3789,
      location: 'Piyungan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-07-15T09:55:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.5,
      depth: 11,
      lat: -7.8654,
      lon: 110.3012,
      location: 'Banguntapan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-06-10T02:30:00Z'),
      dirasakan: 'Dirasakan (Skala MMI IV)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.2,
      depth: 18,
      lat: -7.9234,
      lon: 110.3567,
      location: 'Kretek, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-05-05T15:10:00Z'),
      dirasakan: 'Dirasakan (Skala MMI II)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 5.1,
      depth: 13,
      lat: -7.8876,
      lon: 110.3345,
      location: 'Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-04-01T22:45:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
    {
      magnitude: 4.6,
      depth: 19,
      lat: -7.9456,
      lon: 110.389,
      location: 'Srandakan, Bantul',
      region: 'Yogyakarta',
      time: new Date('2024-03-15T07:00:00Z'),
      dirasakan: 'Dirasakan (Skala MMI III)',
      potential: 'Tidak berpotensi tsunami',
    },
  ];

  for (const eq of earthquakes) {
    await prisma.$executeRaw`
      INSERT INTO "Earthquake" (magnitude, depth, lat, lon, geom, location, region, time, "dirasakan", potential, "isLatest")
      VALUES (
        ${eq.magnitude},
        ${eq.depth},
        ${eq.lat},
        ${eq.lon},
        ST_SetSRID(ST_MakePoint(${eq.lon}, ${eq.lat}), 4326),
        ${eq.location},
        ${eq.region},
        ${eq.time},
        ${eq.dirasakan},
        ${eq.potential},
        false
      )
    `;
  }

  console.log(`✅ Created ${earthquakes.length} earthquake records`);

  // 3. Create Hazard Zones
  console.log('⚠️  Creating hazard zones...');

  const hazardZones = [
    {
      name: 'Zona Rawan Tinggi Pantai Selatan',
      level: 'HIGH',
      description:
        'Area pesisir pantai selatan Bantul yang rawan tsunami dan gempa',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [110.28, -7.98],
            [110.42, -7.98],
            [110.42, -8.02],
            [110.28, -8.02],
            [110.28, -7.98],
          ],
        ],
      },
    },
    {
      name: 'Zona Rawan Sedang Perbukitan',
      level: 'MEDIUM',
      description: 'Area perbukitan dengan potensi longsor saat gempa',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [110.35, -7.88],
            [110.45, -7.88],
            [110.45, -7.95],
            [110.35, -7.95],
            [110.35, -7.88],
          ],
        ],
      },
    },
    {
      name: 'Zona Rawan Rendah Dataran',
      level: 'LOW',
      description: 'Area dataran dengan risiko gempa rendah',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [110.3, -7.85],
            [110.38, -7.85],
            [110.38, -7.9],
            [110.3, -7.9],
            [110.3, -7.85],
          ],
        ],
      },
    },
  ];

  for (const zone of hazardZones) {
    await prisma.$executeRaw`
      INSERT INTO "HazardZone" (name, level, geometry, geom, description, "createdAt", "updatedAt")
      VALUES (
        ${zone.name},
        ${zone.level}::"HazardLevel",
        ${JSON.stringify(zone.geometry)}::jsonb,
        ST_GeomFromGeoJSON(${JSON.stringify(zone.geometry)}),
        ${zone.description},
        NOW(),
        NOW()
      )
    `;
  }

  console.log(`✅ Created ${hazardZones.length} hazard zones`);

  // 4. EvacuationLocations — managed separately
  // EvacuationLocation data will be imported from lokasi_potensial_evakuasi.geojson
  // via a separate seeder script
  const existingEvacuationLocations = await prisma.evacuationLocation.count();
  console.log(
    `🏠 EvacuationLocation table: ${existingEvacuationLocations} existing evacuationLocations (managed by separate import script, not touched by seed).`,
  );

  // 5. Roads — managed separately
  // Road data is imported via: npm run db:import-roads
  // Road names are enriched via: npm run db:enrich-roads
  // Running those scripts will populate the Road table with 12,000+ segments from JALAN_LN_25K.geojson + NAMA_RUAS_JALAN.geojson
  const existingRoads = await prisma.road.count();
  console.log(
    `🛣️  Road table: ${existingRoads} existing road segments (managed by import-roads script, not touched by seed).`,
  );

  // 6. Create Public Facilities
  console.log('🏥 Creating public facilities...');

  const facilities = [
    {
      name: 'RSUD Panembahan Senopati',
      type: 'Hospital',
      lat: -7.8912,
      lon: 110.3298,
      address: 'Jl. Jenderal Sudirman, Bantul',
    },
    {
      name: 'Puskesmas Bantul I',
      type: 'Health Center',
      lat: -7.8856,
      lon: 110.3334,
      address: 'Jl. Gajah Mada, Bantul',
    },
    {
      name: 'Kantor Polres Bantul',
      type: 'Police Station',
      lat: -7.8834,
      lon: 110.3267,
      address: 'Jl. Jenderal Sudirman, Bantul',
    },
    {
      name: 'Kantor PMI Bantul',
      type: 'Red Cross',
      lat: -7.8901,
      lon: 110.3312,
      address: 'Jl. R.W. Monginsidi, Bantul',
    },
    {
      name: 'Kantor BPBD Bantul',
      type: 'Disaster Management',
      lat: -7.8878,
      lon: 110.3289,
      address: 'Jl. Veteran, Bantul',
    },
    {
      name: 'Pasar Bantul',
      type: 'Market',
      lat: -7.8867,
      lon: 110.3323,
      address: 'Jl. Jenderal Sudirman, Bantul',
    },
  ];

  for (const facility of facilities) {
    await prisma.publicFacility.create({
      data: {
        name: facility.name,
        type: facility.type,
        geometry: {
          type: 'Point',
          coordinates: [facility.lon, facility.lat],
        },
        address: facility.address,
      },
    });
  }

  console.log(`✅ Created ${facilities.length} public facilities`);

  const finalRoadCount = await prisma.road.count();
  const finalEvacuationLocationCount = await prisma.evacuationLocation.count();
  console.log('✨ Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(
    `   - Users: ${4 + officers.length} (1 admin, 1 user, ${officers.length} officers)`,
  );
  console.log(`   - Earthquakes: ${earthquakes.length}`);
  console.log(`   - Hazard Zones: ${hazardZones.length}`);
  console.log(
    `   - EvacuationLocations: ${finalEvacuationLocationCount} (not cleared — managed by separate import script)`,
  );
  console.log(
    `   - Roads: ${finalRoadCount} (not cleared — managed by import-roads script)`,
  );
  console.log(`   - Public Facilities: ${facilities.length}`);
  console.log('');
  console.log('💡 If Roads table is empty, run:');
  console.log(
    '     npm run db:import-roads  (imports geometry from JALAN_LN_25K.geojson)',
  );
  console.log(
    '     npm run db:enrich-roads  (adds names from NAMA_RUAS_JALAN.geojson)',
  );
  console.log('');
  console.log('💡 If EvacuationLocations table is empty, run the evacuationLocation import script');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
