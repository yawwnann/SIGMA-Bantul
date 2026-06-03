import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseTime(tanggalStr: string, timeStr: string): Date {
  try {
    // tanggalStr: "1/4/2021 0:00" -> split by space -> "1/4/2021"
    const datePart = tanggalStr.split(' ')[0];
    const parts = datePart.split('/');
    
    // Asumsi format DD/MM/YYYY atau M/D/YYYY, kita coba parse secara aman
    // Kalau parts[2] panjangnya 4, itu tahun
    const year = parts[2];
    const month = parts[1].padStart(2, '0'); // Asumsi format DD/MM/YYYY atau MM/DD/YYYY tergantung lokal
    // Jika formatnya M/D/YYYY, parts[0] is month. Untuk aman, kita pakai Date parsing Javascript
    // "2021-04-01T17:32:28Z"
    
    // Tapi kita bisa langsung coba gabungkan karena origin time sudah UTC
    const combinedStr = `${datePart} ${timeStr} UTC`;
    const d = new Date(combinedStr);
    
    if (isNaN(d.getTime())) {
      // fallback
      return new Date();
    }
    return d;
  } catch (e) {
    return new Date();
  }
}

async function main() {
  console.log('🌍 Starting earthquake seeding from GeoJSON (Sebaran Gempa)...');

  let filePath = path.join(__dirname, '../../data/GeoJSon/sebaran_gempa.geojson');
  if (!fs.existsSync(filePath)) {
    // Coba path dengan huruf besar "Data" untuk VPS (Linux case-sensitive)
    filePath = path.join(__dirname, '../../Data/GeoJSon/sebaran_gempa.geojson');
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found in data or Data: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const geojson = JSON.parse(fileContent);

  if (!geojson.features || !Array.isArray(geojson.features)) {
    console.error('❌ Invalid GeoJSON structure');
    process.exit(1);
  }

  const features = geojson.features;
  console.log(`📊 Found ${features.length} earthquakes in GeoJSON`);

  console.log('🗑️ Clearing existing earthquake data...');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Earthquake" RESTART IDENTITY CASCADE;`
  );

  console.log('⏳ Inserting data in batches... (this might take a minute)');
  
  const BATCH_SIZE = 500;
  let successCount = 0;
  
  for (let i = 0; i < features.length; i += BATCH_SIZE) {
    const batch = features.slice(i, i + BATCH_SIZE);
    
    // We construct a bulk insert raw query
    let values = [];
    
    for (let j = 0; j < batch.length; j++) {
      const props = batch[j].properties;
      const magnitude = parseFloat(props['Magnitude']) || 0;
      const depth = parseFloat(props['Kedalaman (km)']) || 0;
      const lat = parseFloat(props['Latitude']) || 0;
      const lon = parseFloat(props['Longitude']) || 0;
      
      const tanggal = props['Tanggal'] || '';
      const timeStr = props['Origin Time (UTC)'] || '';
      const time = parseTime(tanggal, timeStr);
      
      const isLatest = (i === 0 && j === 0) ? 'true' : 'false';
      
      values.push(`(${magnitude}, ${depth}, ${lat}, ${lon}, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326), 'Bantul dan Sekitarnya', 'Yogyakarta', '${time.toISOString()}', NULL, NULL, ${isLatest})`);
    }

    if (values.length > 0) {
      const query = `
        INSERT INTO "Earthquake" (magnitude, depth, lat, lon, geom, location, region, time, "dirasakan", potential, "isLatest")
        VALUES ${values.join(',')}
      `;
      
      await prisma.$executeRawUnsafe(query);
      successCount += values.length;
      console.log(`✅ Inserted ${successCount} / ${features.length}`);
    }
  }

  console.log(`✨ Seeding completed! Successfully added ${successCount} earthquake records.`);
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding data gempa:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
