import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Mencoba terhubung ke PostgreSQL...');

  try {
    // 1. Cek PostgreSQL Version
    const pgVersion: any[] = await prisma.$queryRaw`SELECT version();`;
    console.log('✅ Berhasil terhubung ke PostgreSQL (Supabase)!');
    console.log('PostgreSQL Version:', pgVersion[0].version);

    console.log('\nSedang memeriksa ekstensi PostGIS...');
    
    // 2. Cek PostGIS Version
    const postgisVersion: any[] = await prisma.$queryRaw`SELECT PostGIS_Version();`;
    console.log('✅ Ekstensi PostGIS terdeteksi dan bisa digunakan!');
    console.log('PostGIS Version:', postgisVersion[0].postgis_version);

    console.log('\nKoneksi Databse Supabase dan PostGIS telah siap digunakan untuk analisis spasial.');
  } catch (error) {
    console.error('❌ Uji koneksi atau pengecekan PostGIS gagal.');
    console.error('Pesan error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
