import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanEarthquakes() {
  console.log('🧹 Starting earthquake data cleanup...');

  try {
    // Count earthquakes before deletion
    const countBefore = await prisma.earthquake.count();
    console.log(`📊 Total earthquakes in database: ${countBefore}`);

    if (countBefore === 0) {
      console.log('✅ Database is already clean. No earthquakes to delete.');
      return;
    }

    // Confirm deletion
    console.log('⚠️  This will delete ALL earthquake data from the database.');
    console.log('🗑️  Deleting earthquakes...');

    // Delete all earthquakes
    const result = await prisma.earthquake.deleteMany({});

    console.log(`✅ Successfully deleted ${result.count} earthquake records`);
    console.log('🎉 Database cleanup completed!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanEarthquakes()
  .then(() => {
    console.log('✨ Cleanup script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
