import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseTime(tanggalStr: string, timeStr: string): Date {
  try {
    if (!tanggalStr) return new Date();
    
    // Parse tanggalStr: "1/4/2021" (M/D/YYYY) or "1/4/2021 0:00"
    const datePart = tanggalStr.split(' ')[0];
    const parts = datePart.split('/');
    if (parts.length !== 3) return new Date();
    
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Parse timeStr: "17:32:28.9824" or "06:27:54 AM"
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let ms = 0;

    if (timeStr) {
      const isPM = timeStr.includes('PM');
      const isAM = timeStr.includes('AM');
      const cleanTime = timeStr.replace(/ AM| PM/g, '');
      const timeParts = cleanTime.split(':');
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
        if (timeParts[2]) {
          const secParts = timeParts[2].split('.');
          seconds = parseInt(secParts[0], 10) || 0;
          if (secParts[1]) {
            ms = parseInt(secParts[1].substring(0, 3).padEnd(3, '0'), 10) || 0;
          }
        }
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
    }

    const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, ms));
    if (isNaN(d.getTime())) return new Date();
    return d;
  } catch (e) {
    return new Date();
  }
}

function pointInPolygon(lng: number, lat: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function isWithinBantul(lat: number, lng: number, multiPolygonCoords: number[][][][]): boolean {
  for (const polygon of multiPolygonCoords) {
    const outerRing = polygon[0];
    if (outerRing && pointInPolygon(lng, lat, outerRing)) {
      return true;
    }
  }
  return false;
}

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  brng = (brng + 360) % 360;

  const directions = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
  const index = Math.round(brng / 45) % 8;
  return directions[index];
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
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

function getVillage(lat: number, lng: number, features: any[]): string | null {
  for (const feature of features) {
    if (!feature.geometry || !feature.geometry.coordinates) continue;
    
    const type = feature.geometry.type;
    const coords = feature.geometry.coordinates;
    
    if (type === 'Polygon') {
      if (pointInPolygon(lng, lat, coords[0])) {
        return feature.properties.nm_kelurahan || null;
      }
    } else if (type === 'MultiPolygon') {
      for (const polygon of coords) {
        if (polygon[0] && pointInPolygon(lng, lat, polygon[0])) {
          return feature.properties.nm_kelurahan || null;
        }
      }
    }
  }
  return null;
}

  console.log('🗺️ Loading Bantul boundary for clipping...');
  let bantulCoords: number[][][][] | null = null;
  let bantulPath = path.join(__dirname, '../../data/GeoJSon/34.02_Bantul.geojson');
  if (!fs.existsSync(bantulPath)) {
    bantulPath = path.join(__dirname, '../../Data/GeoJSon/34.02_Bantul.geojson');
  }
  if (fs.existsSync(bantulPath)) {
    try {
      const bantulGeojson = JSON.parse(fs.readFileSync(bantulPath, 'utf8'));
      bantulCoords = bantulGeojson.features?.[0]?.geometry?.coordinates;
      console.log('✅ Bantul boundary loaded successfully.');
    } catch (e) {
      console.error('⚠️ Failed to parse Bantul GeoJSON', e);
    }
  } else {
    console.error(`⚠️ Bantul boundary file not found: ${bantulPath}`);
  }

  console.log('🗺️ Loading Kelurahan boundaries...');
  let kelurahanFeatures: any[] = [];
  let kelurahanPath = path.join(__dirname, '../../data/GeoJSon/34.02_kelurahan.geojson');
  if (!fs.existsSync(kelurahanPath)) {
    kelurahanPath = path.join(__dirname, '../../Data/GeoJSon/34.02_kelurahan.geojson');
  }
  if (fs.existsSync(kelurahanPath)) {
    try {
      const kelurahanGeojson = JSON.parse(fs.readFileSync(kelurahanPath, 'utf8'));
      kelurahanFeatures = kelurahanGeojson.features || [];
      console.log(`✅ Kelurahan boundaries loaded successfully (${kelurahanFeatures.length} villages).`);
    } catch (e) {
      console.error('⚠️ Failed to parse Kelurahan GeoJSON', e);
    }
  } else {
    console.error(`⚠️ Kelurahan boundary file not found: ${kelurahanPath}`);
  }

  console.log('🗑️ Clearing existing earthquake data...');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Earthquake" RESTART IDENTITY CASCADE;`
  );

  console.log('⏳ Inserting data in batches... (this might take a minute)');
  
  const BATCH_SIZE = 500;
  let successCount = 0;
  
  // Bantul center coordinates for distance calculation
  const BANTUL_LAT = -7.876;
  const BANTUL_LON = 110.327;

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
      
      const dist = Math.round(getDistance(BANTUL_LAT, BANTUL_LON, lat, lon));
      const bearing = getBearing(BANTUL_LAT, BANTUL_LON, lat, lon);
      
      const villageName = getVillage(lat, lon, kelurahanFeatures);
      
      let locName = '';
      if (villageName) {
        locName = `Kel. ${villageName}, Bantul`;
      } else {
        locName = dist === 0 ? 'BANTUL-DIY' : `${dist} km ${bearing} BANTUL-DIY`;
      }

      const isLatest = (i === 0 && j === 0) ? 'true' : 'false';
      
      values.push(`(${magnitude}, ${depth}, ${lat}, ${lon}, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326), '${locName}', 'Yogyakarta', '${time.toISOString()}', NULL, NULL, ${isLatest})`);
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
