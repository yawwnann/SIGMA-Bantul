import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RoadFeature {
  type: 'Feature';
  properties: {
    oneway?: string;
    [key: string]: any;
  };
  geometry: any;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: RoadFeature[];
}

// Bobot default untuk Weighted Overlay
const WEIGHTS = {
  distance: 0.5,    // Jarak (50%) - base
  hazard: 0.25,     // Kerawanan Gempa (25%)
  condition: 0.25,  // Kondisi Jalan (25%)
};

async function main() {
  console.log('🚀 Starting Oneway & Cost Update...');

  const geojsonPath = path.join(__dirname, '../Data/GeoJSon/Jalan_fix.geojson');

  if (!fs.existsSync(geojsonPath)) {
    console.error('❌ Dataset not found at:', geojsonPath);
    process.exit(1);
  }

  console.log('📁 Reading Jalan_fix.geojson...');
  const geojsonData: GeoJSONFeatureCollection = JSON.parse(
    fs.readFileSync(geojsonPath, 'utf-8'),
  );

  console.log(`✅ Membaca ${geojsonData.features.length} fitur dari GeoJSON`);

  // Ambil data jalan yang ada di DB untuk dicocokkan (berdasarkan id berurutan atau nama/koordinat)
  // Untuk metode teraman dan tercepat, karena urutan di DB sama dengan iterasi insert di seed,
  // kita akan update menggunakan id, asumsi id mulai dari 1 sampai panjang fitur, atau kita update via nama.
  // Tapi paling aman adalah fetch semua jalan, lalu update satu per satu secara paralel/batch.
  
  // Karena struktur DB dan GeoJSON sudah sinkron saat import, kita akan fetch semua roads
  const roads = await prisma.road.findMany({
    orderBy: { id: 'asc' }
  });

  console.log(`✅ Menemukan ${roads.length} jalan di database`);

  let updatedCount = 0;
  
  // Mapping oneway dari GeoJSON ke DB (asumsi index sama karena seed dimasukkan berurutan)
  // Namun, ada jalan yang di-skip saat seed karena invalid geometry. 
  // Jadi kita harus mencocokkan geometri atau atribut lain, atau mengupdate ulang dari awal.
  // Solusi paling stabil: Karena ini hanya atribut oneway, dan kita bisa mengambil nilai oneway saat insert awal.
  // Sebagai fallback, kita bisa update nilai "cost" dan "reverse_cost" menggunakan raw query untuk seluruh tabel,
  // dan menggunakan nilai default 'no' untuk oneway jika kita kesulitan mencocokkannya 1-1 tanpa atribut ID unik.
  
  // OPSI AMAN: Daripada mencocokkan array yang beda panjang (karena skipped roads di seed-jalan-lengkap), 
  // kita akan update rumus base_cost ke seluruh jalan. Jika user sudah menjalankan seed-jalan-lengkap terbaru, 
  // kolom oneway sudah terisi. Jika belum, oneway bernilai null dan dianggap 2 arah.
  
  console.log('\n📏 Menghitung ulang weighted overlay cost untuk seluruh jalan...');
  
  // Formula: base_cost = distance * (1 + (combinedHazard * W_hazard) + (conditionScore * W_condition))
  // Kita beri bobot pada hazard (1-4) dan kondisi jalan (1-4).
  
  await prisma.$executeRaw`
    WITH RoadScores AS (
      SELECT 
        id,
        ST_Length(geom::geography) as dist,
        COALESCE("combinedHazard", 2) as hazard_score,
        CASE condition
          WHEN 'GOOD' THEN 1
          WHEN 'MODERATE' THEN 2
          WHEN 'POOR' THEN 3
          WHEN 'DAMAGED' THEN 4
          ELSE 2
        END as condition_score
      FROM "Road"
      WHERE geom IS NOT NULL
    ),
    CalculatedCosts AS (
      SELECT
        id,
        -- Weighted Overlay: Dist * (1 + HazardScore*0.25 + ConditionScore*0.25)
        dist * (1 + (hazard_score * ${WEIGHTS.hazard}) + (condition_score * ${WEIGHTS.condition})) as base_cost
      FROM RoadScores
    )
    UPDATE "Road" r
    SET 
      safe_cost = c.base_cost,
      cost = CASE 
        WHEN r.oneway = '-1' THEN -1 
        ELSE c.base_cost 
      END,
      reverse_cost = CASE 
        WHEN r.oneway = 'yes' THEN -1 
        ELSE c.base_cost 
      END
    FROM CalculatedCosts c
    WHERE r.id = c.id;
  `;
  
  console.log(`✅ Seluruh cost dan reverse_cost jalan berhasil diperbarui dengan Weighted Overlay.`);
  console.log(`ℹ️  Catatan: Pastikan Anda menjalankan ulang "npm run seed" dengan seed-jalan-lengkap.ts versi terbaru agar data 'oneway' dari GeoJSON tersimpan ke database sebelum script ini berjalan optimal.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
