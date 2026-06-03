import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌍 Starting earthquake seeding (Sebaran Gempa)...');

  // Clear existing earthquake data
  console.log('🗑️ Clearing existing earthquake data...');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Earthquake" RESTART IDENTITY CASCADE;`
  );

  const earthquakes = [
    // 2026 earthquakes
    { magnitude: 5.2, depth: 10, lat: -7.8876, lon: 110.3306, location: 'Bantul', region: 'Yogyakarta', time: new Date('2026-04-15T08:30:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.8, depth: 15, lat: -7.9123, lon: 110.3567, location: 'Imogiri, Bantul', region: 'Yogyakarta', time: new Date('2026-04-10T14:20:00Z'), dirasakan: 'Dirasakan (Skala MMI II)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 3.9, depth: 8, lat: -7.8654, lon: 110.389, location: 'Banguntapan, Bantul', region: 'Yogyakarta', time: new Date('2026-04-05T03:15:00Z'), dirasakan: 'Tidak dirasakan', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.5, depth: 12, lat: -7.9345, lon: 110.3123, location: 'Srandakan, Bantul', region: 'Yogyakarta', time: new Date('2026-03-28T19:45:00Z'), dirasakan: 'Dirasakan (Skala MMI IV)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.2, depth: 20, lat: -7.8789, lon: 110.3445, location: 'Sewon, Bantul', region: 'Yogyakarta', time: new Date('2026-03-20T11:30:00Z'), dirasakan: 'Dirasakan (Skala MMI II)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.8, depth: 10, lat: -7.9012, lon: 110.3678, location: 'Pleret, Bantul', region: 'Yogyakarta', time: new Date('2026-03-12T06:20:00Z'), dirasakan: 'Dirasakan (Skala MMI V)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.5, depth: 18, lat: -7.8567, lon: 110.3234, location: 'Kasihan, Bantul', region: 'Yogyakarta', time: new Date('2026-03-05T22:10:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 3.7, depth: 25, lat: -7.9234, lon: 110.3456, location: 'Piyungan, Bantul', region: 'Yogyakarta', time: new Date('2026-02-28T15:40:00Z'), dirasakan: 'Tidak dirasakan', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.1, depth: 14, lat: -7.889, lon: 110.3789, location: 'Banguntapan, Bantul', region: 'Yogyakarta', time: new Date('2026-02-20T09:25:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.9, depth: 16, lat: -7.9456, lon: 110.3012, location: 'Kretek, Bantul', region: 'Yogyakarta', time: new Date('2026-02-10T18:50:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    
    // 2025 earthquakes
    { magnitude: 5.3, depth: 11, lat: -7.8723, lon: 110.3567, location: 'Sewon, Bantul', region: 'Yogyakarta', time: new Date('2025-12-15T07:30:00Z'), dirasakan: 'Dirasakan (Skala MMI IV)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.6, depth: 19, lat: -7.9123, lon: 110.389, location: 'Imogiri, Bantul', region: 'Yogyakarta', time: new Date('2025-11-20T13:15:00Z'), dirasakan: 'Dirasakan (Skala MMI II)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 3.8, depth: 22, lat: -7.8567, lon: 110.3123, location: 'Kasihan, Bantul', region: 'Yogyakarta', time: new Date('2025-10-25T20:40:00Z'), dirasakan: 'Tidak dirasakan', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.6, depth: 9, lat: -7.9345, lon: 110.3678, location: 'Pleret, Bantul', region: 'Yogyakarta', time: new Date('2025-09-30T04:20:00Z'), dirasakan: 'Dirasakan (Skala MMI V)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.3, depth: 17, lat: -7.889, lon: 110.3234, location: 'Sewon, Bantul', region: 'Yogyakarta', time: new Date('2025-08-18T16:55:00Z'), dirasakan: 'Dirasakan (Skala MMI II)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.0, depth: 13, lat: -7.9012, lon: 110.3456, location: 'Piyungan, Bantul', region: 'Yogyakarta', time: new Date('2025-07-22T10:30:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.7, depth: 21, lat: -7.8654, lon: 110.3789, location: 'Banguntapan, Bantul', region: 'Yogyakarta', time: new Date('2025-06-15T23:10:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 3.9, depth: 24, lat: -7.9234, lon: 110.3012, location: 'Kretek, Bantul', region: 'Yogyakarta', time: new Date('2025-05-10T12:45:00Z'), dirasakan: 'Tidak dirasakan', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.4, depth: 10, lat: -7.8876, lon: 110.3567, location: 'Bantul', region: 'Yogyakarta', time: new Date('2025-04-05T08:20:00Z'), dirasakan: 'Dirasakan (Skala MMI IV)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.4, depth: 15, lat: -7.9456, lon: 110.3345, location: 'Srandakan, Bantul', region: 'Yogyakarta', time: new Date('2025-03-01T19:35:00Z'), dirasakan: 'Dirasakan (Skala MMI II)', potential: 'Tidak berpotensi tsunami' },
    
    // 2024 earthquakes
    { magnitude: 5.7, depth: 8, lat: -7.8723, lon: 110.389, location: 'Banguntapan, Bantul', region: 'Yogyakarta', time: new Date('2024-12-20T05:15:00Z'), dirasakan: 'Dirasakan (Skala MMI V)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.1, depth: 20, lat: -7.9123, lon: 110.3123, location: 'Imogiri, Bantul', region: 'Yogyakarta', time: new Date('2024-11-15T14:50:00Z'), dirasakan: 'Dirasakan (Skala MMI II)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.8, depth: 12, lat: -7.8567, lon: 110.3678, location: 'Kasihan, Bantul', region: 'Yogyakarta', time: new Date('2024-10-10T21:25:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.2, depth: 16, lat: -7.9345, lon: 110.3234, location: 'Pleret, Bantul', region: 'Yogyakarta', time: new Date('2024-09-05T11:40:00Z'), dirasakan: 'Dirasakan (Skala MMI IV)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 3.6, depth: 23, lat: -7.889, lon: 110.3456, location: 'Sewon, Bantul', region: 'Yogyakarta', time: new Date('2024-08-01T17:20:00Z'), dirasakan: 'Tidak dirasakan', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.9, depth: 14, lat: -7.9012, lon: 110.3789, location: 'Piyungan, Bantul', region: 'Yogyakarta', time: new Date('2024-07-15T09:55:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.5, depth: 11, lat: -7.8654, lon: 110.3012, location: 'Banguntapan, Bantul', region: 'Yogyakarta', time: new Date('2024-06-10T02:30:00Z'), dirasakan: 'Dirasakan (Skala MMI IV)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.2, depth: 18, lat: -7.9234, lon: 110.3567, location: 'Kretek, Bantul', region: 'Yogyakarta', time: new Date('2024-05-05T15:10:00Z'), dirasakan: 'Dirasakan (Skala MMI II)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 5.1, depth: 13, lat: -7.8876, lon: 110.3345, location: 'Bantul', region: 'Yogyakarta', time: new Date('2024-04-01T22:45:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
    { magnitude: 4.6, depth: 19, lat: -7.9456, lon: 110.389, location: 'Srandakan, Bantul', region: 'Yogyakarta', time: new Date('2024-03-15T07:00:00Z'), dirasakan: 'Dirasakan (Skala MMI III)', potential: 'Tidak berpotensi tsunami' },
  ];

  let count = 0;
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
        ${count === 0 ? true : false}
      )
    `;
    count++;
  }

  console.log(`✅ Berhasil menambahkan ${earthquakes.length} data sebaran gempa bumi`);
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding data gempa:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
