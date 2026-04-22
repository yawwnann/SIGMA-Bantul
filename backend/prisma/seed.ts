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
    'Shelter',
    'HazardZone',
    'Earthquake',
    'User',
  ];

  for (const tableName of tableNames) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
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

  console.log(`✅ Created ${2} users`);

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

  // 4. Create Shelters
  console.log('🏠 Creating shelters...');

  const shelters = [
    {
      name: 'GOR Sewon',
      capacity: 500,
      lat: -7.856296108383715,
      lon: 110.3541890723684,
      address: 'Jl. Parangtritis, Sewon, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Dapur Umum, Ruang P3K, Area Tidur Luas',
    },
    {
      name: 'Balai Desa Kasihan',
      capacity: 350,
      lat: -7.8172463029681545,
      lon: 110.32738532919865,
      address: 'Kecamatan Kasihan, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Ruang Pertemuan, Logistik',
    },
    {
      name: 'Gedung Serbaguna Sedayu',
      capacity: 300,
      lat: -7.810991262758507,
      lon: 110.26710368838619,
      address: 'Sedayu, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Mushola, Parkir Luas',
    },
    {
      name: 'Stadion Srandakan',
      capacity: 1000,
      lat: -7.983198689076997,
      lon: 110.23214808212752,
      address: 'Srandakan, Bantul',
      condition: 'MODERATE',
      facilities: 'Lapangan Terbuka, Toilet, Akses Kendaraan Besar',
    },
    {
      name: 'Shelter Pantai Sanden',
      capacity: 400,
      lat: -7.997576382455282,
      lon: 110.26056663018072,
      address: 'Pesisir Sanden, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Tower Pantau, Ruang Evakuasi',
    },
    {
      name: 'Pendopo Kecamatan Kretek',
      capacity: 450,
      lat: -8.011006967463425,
      lon: 110.29957717156773,
      address: 'Jl. Parangtritis Km. 21, Kretek',
      condition: 'GOOD',
      facilities: 'Toilet, Dapur Umum, Pusat Informasi',
    },
    {
      name: 'Pusat Evakuasi Pundong',
      capacity: 300,
      lat: -7.966843246218961,
      lon: 110.34330084036814,
      address: 'Pundong, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Ruang Medis, Gudang Bantuan',
    },
    {
      name: 'Balai Rehabilitasi Bambanglipuro',
      capacity: 250,
      lat: -7.937652158922342,
      lon: 110.31667473812948,
      address: 'Bambanglipuro, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Ruang Rawat, Dapur',
    },
    {
      name: 'Gedung Dakwah Pandak',
      capacity: 200,
      lat: -7.92690343469998,
      lon: 110.2862179446127,
      address: 'Pandak, Bantul',
      condition: 'MODERATE',
      facilities: 'Toilet, Ruang Pertemuan',
    },
    {
      name: 'Shelter Utama Pajangan',
      capacity: 300,
      lat: -7.8699648307220444,
      lon: 110.29329769624071,
      address: 'Pajangan, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Air Bersih, Listrik Cadangan',
    },
    {
      name: 'Pendopo Kabupaten Bantul (Pusat)',
      capacity: 600,
      lat: -7.894107619527859,
      lon: 110.33420878643149,
      address: 'Pusat Kota Bantul',
      condition: 'GOOD',
      facilities: 'Fasilitas Lengkap, Pusat Komando, Medis',
    },
    {
      name: 'GOR Jetis',
      capacity: 400,
      lat: -7.909525884997565,
      lon: 110.36451410459532,
      address: 'Jetis, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Lapangan Indoor, Dapur Umum',
    },
    {
      name: 'Shelter Budaya Imogiri',
      capacity: 350,
      lat: -7.932017147008937,
      lon: 110.40120957934438,
      address: 'Kawasan Wisata Imogiri',
      condition: 'GOOD',
      facilities: 'Toilet, Pendopo Luas, Air Bersih',
    },
    {
      name: 'Camp Pengungsian Dlingo',
      capacity: 500,
      lat: -7.934798532886147,
      lon: 110.45941807062738,
      address: 'Dataran Tinggi Dlingo',
      condition: 'MODERATE',
      facilities: 'Tenda Besar, Toilet Portable, Dapur Umum',
    },
    {
      name: 'Pusat Logistik Banguntapan',
      capacity: 700,
      lat: -7.8200834212668875,
      lon: 110.40604025360231,
      address: 'Jl. Gedongkuning, Banguntapan',
      condition: 'GOOD',
      facilities: 'Gudang Logistik, Toilet, Ruang P3K',
    },
    {
      name: 'Gedung Pertemuan Pleret',
      capacity: 300,
      lat: -7.87444687784069,
      lon: 110.41206753760906,
      address: 'Pleret, Bantul',
      condition: 'GOOD',
      facilities: 'Toilet, Dapur, Area Parkir',
    },
    {
      name: 'Shelter Piyungan',
      capacity: 250,
      lat: -7.840298523727882,
      lon: 110.46776033793965,
      address: 'Jl. Wonosari, Piyungan',
      condition: 'MODERATE',
      facilities: 'Toilet, Ruang Tunggu, Akses Jalan Raya',
    },
  ];

  for (const shelter of shelters) {
    await prisma.$executeRaw`
      INSERT INTO "Shelter" (name, capacity, geometry, geom, address, condition, facilities, "createdAt", "updatedAt")
      VALUES (
        ${shelter.name},
        ${shelter.capacity},
        ${JSON.stringify({ type: 'Point', coordinates: [shelter.lon, shelter.lat] })}::jsonb,
        ST_SetSRID(ST_MakePoint(${shelter.lon}, ${shelter.lat}), 4326),
        ${shelter.address},
        ${shelter.condition}::"ShelterCondition",
        ${shelter.facilities},
        NOW(),
        NOW()
      )
    `;
  }

  console.log(`✅ Created ${shelters.length} shelters`);

  // 5. Roads — managed separately
  // Road data is imported via: npm run db:import-roads
  // Road names are enriched via: npm run db:enrich-roads
  // Running those scripts will populate the Road table with 12,000+ segments from JALAN_LN_25K.geojson + NAMA_RUAS_JALAN.geojson
  const existingRoads = await prisma.road.count();
  console.log(`🛣️  Road table: ${existingRoads} existing road segments (managed by import-roads script, not touched by seed).`);

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
  console.log('✨ Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Users: 2`);
  console.log(`   - Earthquakes: ${earthquakes.length}`);
  console.log(`   - Hazard Zones: ${hazardZones.length}`);
  console.log(`   - Shelters: ${shelters.length}`);
  console.log(`   - Roads: ${finalRoadCount} (not cleared — managed by import-roads script)`);
  console.log(`   - Public Facilities: ${facilities.length}`);
  console.log('');
  console.log('💡 If Roads table is empty, run:');
  console.log('     npm run db:import-roads  (imports geometry from JALAN_LN_25K.geojson)');
  console.log('     npm run db:enrich-roads  (adds names from NAMA_RUAS_JALAN.geojson)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
