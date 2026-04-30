import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function cleanEarthquakes() {
  console.log('🧹 Earthquake Data Cleanup Tool');
  console.log('================================\n');

  try {
    // Count earthquakes
    const totalCount = await prisma.earthquake.count();
    console.log(`📊 Total earthquakes in database: ${totalCount}`);

    if (totalCount === 0) {
      console.log('✅ Database is already clean. No earthquakes to delete.');
      rl.close();
      return;
    }

    // Show statistics
    const oldestEq = await prisma.earthquake.findFirst({
      orderBy: { time: 'asc' },
      select: { time: true, location: true, magnitude: true },
    });

    const newestEq = await prisma.earthquake.findFirst({
      orderBy: { time: 'desc' },
      select: { time: true, location: true, magnitude: true },
    });

    console.log('\n📈 Database Statistics:');
    console.log(
      `   Oldest: ${oldestEq?.time.toISOString()} - M${oldestEq?.magnitude} ${oldestEq?.location}`,
    );
    console.log(
      `   Newest: ${newestEq?.time.toISOString()} - M${newestEq?.magnitude} ${newestEq?.location}`,
    );

    // Show options
    console.log('\n🔧 Cleanup Options:');
    console.log('   1. Delete ALL earthquakes');
    console.log('   2. Delete earthquakes older than 30 days');
    console.log('   3. Delete earthquakes older than 90 days');
    console.log('   4. Delete earthquakes older than 1 year');
    console.log('   5. Keep only latest 100 earthquakes');
    console.log('   6. Cancel');

    const choice = await question('\nSelect option (1-6): ');

    let deleteCount = 0;

    switch (choice.trim()) {
      case '1':
        // Delete all
        const confirmAll = await question(
          `⚠️  Are you sure you want to delete ALL ${totalCount} earthquakes? (yes/no): `,
        );
        if (confirmAll.toLowerCase() === 'yes') {
          const result = await prisma.earthquake.deleteMany({});
          deleteCount = result.count;
          console.log(`✅ Deleted ${deleteCount} earthquakes`);
        } else {
          console.log('❌ Cancelled');
        }
        break;

      case '2':
        // Delete older than 30 days
        const date30 = new Date();
        date30.setDate(date30.getDate() - 30);
        const count30 = await prisma.earthquake.count({
          where: { time: { lt: date30 } },
        });
        console.log(`📊 Found ${count30} earthquakes older than 30 days`);
        const confirm30 = await question(
          `Delete these ${count30} records? (yes/no): `,
        );
        if (confirm30.toLowerCase() === 'yes') {
          const result = await prisma.earthquake.deleteMany({
            where: { time: { lt: date30 } },
          });
          deleteCount = result.count;
          console.log(`✅ Deleted ${deleteCount} earthquakes`);
        } else {
          console.log('❌ Cancelled');
        }
        break;

      case '3':
        // Delete older than 90 days
        const date90 = new Date();
        date90.setDate(date90.getDate() - 90);
        const count90 = await prisma.earthquake.count({
          where: { time: { lt: date90 } },
        });
        console.log(`📊 Found ${count90} earthquakes older than 90 days`);
        const confirm90 = await question(
          `Delete these ${count90} records? (yes/no): `,
        );
        if (confirm90.toLowerCase() === 'yes') {
          const result = await prisma.earthquake.deleteMany({
            where: { time: { lt: date90 } },
          });
          deleteCount = result.count;
          console.log(`✅ Deleted ${deleteCount} earthquakes`);
        } else {
          console.log('❌ Cancelled');
        }
        break;

      case '4':
        // Delete older than 1 year
        const date365 = new Date();
        date365.setDate(date365.getDate() - 365);
        const count365 = await prisma.earthquake.count({
          where: { time: { lt: date365 } },
        });
        console.log(`📊 Found ${count365} earthquakes older than 1 year`);
        const confirm365 = await question(
          `Delete these ${count365} records? (yes/no): `,
        );
        if (confirm365.toLowerCase() === 'yes') {
          const result = await prisma.earthquake.deleteMany({
            where: { time: { lt: date365 } },
          });
          deleteCount = result.count;
          console.log(`✅ Deleted ${deleteCount} earthquakes`);
        } else {
          console.log('❌ Cancelled');
        }
        break;

      case '5':
        // Keep only latest 100
        const toKeep = 100;
        const toDelete = totalCount - toKeep;
        if (toDelete <= 0) {
          console.log(
            `✅ Already have ${totalCount} or fewer earthquakes. Nothing to delete.`,
          );
        } else {
          console.log(
            `📊 Will delete ${toDelete} oldest earthquakes, keeping latest ${toKeep}`,
          );
          const confirmKeep = await question(`Proceed? (yes/no): `);
          if (confirmKeep.toLowerCase() === 'yes') {
            // Get IDs of earthquakes to keep
            const toKeepIds = await prisma.earthquake.findMany({
              orderBy: { time: 'desc' },
              take: toKeep,
              select: { id: true },
            });

            const keepIds = toKeepIds.map((eq) => eq.id);

            // Delete all except those IDs
            const result = await prisma.earthquake.deleteMany({
              where: { id: { notIn: keepIds } },
            });
            deleteCount = result.count;
            console.log(
              `✅ Deleted ${deleteCount} earthquakes, kept latest ${toKeep}`,
            );
          } else {
            console.log('❌ Cancelled');
          }
        }
        break;

      case '6':
        console.log('❌ Cancelled');
        break;

      default:
        console.log('❌ Invalid option');
        break;
    }

    // Show final count
    const finalCount = await prisma.earthquake.count();
    console.log(`\n📊 Final count: ${finalCount} earthquakes remaining`);
    console.log('🎉 Cleanup completed!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanEarthquakes()
  .then(() => {
    console.log('✨ Cleanup script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });
