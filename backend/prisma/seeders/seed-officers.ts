import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting evacuation officers seeding...');

  // 1. Reset existing officer associations
  console.log('Resetting existing EvacuationLocation officer associations...');
  await prisma.evacuationLocation.updateMany({
    data: {
      officerId: null,
    },
  });

  // 2. Delete existing officers to prevent duplicates
  console.log('Deleting existing officers...');
  await prisma.user.deleteMany({
    where: {
      role: 'EVACUATION_LOCATION_OFFICER',
    },
  });

  // 3. Get up to 30 evacuation locations
  const locations = await prisma.evacuationLocation.findMany({
    take: 30,
    orderBy: { id: 'asc' },
  });

  if (locations.length === 0) {
    console.log(
      '⚠️ No evacuation locations found! Please run the evacuation location seeder first.',
    );
    return;
  }

  console.log(
    `Found ${locations.length} evacuation locations to assign officers.`,
  );

  // 4. Create 30 officers and assign them to the locations (1 location = 1 officer)
  const hashedPassword = await bcrypt.hash('password123', 10);

  // List of Indonesian names for realism
  const officerNames = [
    'Ahmad Fauzi',
    'Siti Nurhaliza',
    'Budi Santoso',
    'Dewi Lestari',
    'Eko Prasetyo',
    'Fitri Handayani',
    'Gunawan Wijaya',
    'Hesti Rahmawati',
    'Indra Kusuma',
    'Joko Widodo',
    'Kartika Sari',
    'Lukman Hakim',
    'Maya Anggraini',
    'Nugroho Susanto',
    'Putri Wulandari',
    'Rahmat Hidayat',
    'Sri Wahyuni',
    'Taufik Hidayat',
    'Umi Kulsum',
    'Vina Panduwinata',
    'Wawan Darmawan',
    'Yuli Astuti',
    'Zainal Arifin',
    'Agus Setiawan',
    'Bagus Saputra',
    'Citra Kirana',
    'Deni Setiawan',
    'Eka Putra',
    'Fajar Ramadhan',
    'Gita Gutawa',
  ];

  let assignedCount = 0;

  for (let i = 0; i < Math.min(30, locations.length); i++) {
    const location = locations[i];
    const officerName = officerNames[i] || `Petugas Evakuasi ${i + 1}`;
    const emailName = officerName.toLowerCase().replace(/\s+/g, '.');

    // Create the officer
    const officer = await prisma.user.create({
      data: {
        email: `${emailName}@bantul.go.id`,
        password: hashedPassword,
        name: officerName,
        role: 'EVACUATION_LOCATION_OFFICER',
      },
    });

    // Assign to the location
    await prisma.evacuationLocation.update({
      where: { id: location.id },
      data: { officerId: officer.id },
    });

    assignedCount++;
  }

  console.log(
    `✅ Successfully created and assigned ${assignedCount} officers to ${assignedCount} evacuation locations!`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Error during officer seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
