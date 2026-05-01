import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

async function testMonitoring() {
  console.log('🔍 Testing Monitoring Components...\n');

  // Test Database
  console.log('1️⃣ Testing Database Connection...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database: Connected');

    // Test database size query
    try {
      const sizeResult = await prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      console.log(`   Database Size: ${sizeResult[0]?.size || 'Unknown'}`);
    } catch (err) {
      console.log('⚠️  Database Size Query Failed:', err.message);
    }

    // Test active connections query
    try {
      const connections = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
      `;
      console.log(`   Active Connections: ${connections[0]?.count || 0}`);
    } catch (err) {
      console.log('⚠️  Active Connections Query Failed:', err.message);
    }

    // Test table stats query
    try {
      const tableStats = await prisma.$queryRaw<
        Array<{ table_name: string; row_count: bigint }>
      >`
        SELECT 
          schemaname || '.' || relname as table_name,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 5
      `;
      console.log(`   Top Tables: ${tableStats.length} found`);
      tableStats.forEach((t) => {
        console.log(`     - ${t.table_name}: ${t.row_count} rows`);
      });
    } catch (err) {
      console.log('⚠️  Table Stats Query Failed:', err.message);
    }
  } catch (error) {
    console.log('❌ Database: Disconnected');
    console.log('   Error:', error.message);
  }

  console.log('');

  // Test Redis
  console.log('2️⃣ Testing Redis Connection...');
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
  });

  try {
    await redis.ping();
    console.log('✅ Redis: Connected');

    // Test set/get
    await redis.set('test:monitoring', 'ok');
    const value = await redis.get('test:monitoring');
    console.log(`   Test Set/Get: ${value === 'ok' ? 'OK' : 'Failed'}`);

    // Get keys count
    const keys = await redis.keys('*');
    console.log(`   Total Keys: ${keys.length}`);

    // Clean up
    await redis.del('test:monitoring');
  } catch (error) {
    console.log('❌ Redis: Disconnected');
    console.log('   Error:', error.message);
  } finally {
    await redis.quit();
  }

  console.log('');

  // Test Latency
  console.log('3️⃣ Testing Latency...');

  // Database latency
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    console.log(`✅ Database Latency: ${dbLatency}ms`);
  } catch (error) {
    console.log('❌ Database Latency: Failed');
  }

  // Redis latency
  const redisTest = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  try {
    const redisStart = Date.now();
    await redisTest.get('health:check');
    const redisLatency = Date.now() - redisStart;
    console.log(`✅ Redis Latency: ${redisLatency}ms`);
  } catch (error) {
    console.log('❌ Redis Latency: Failed');
  } finally {
    await redisTest.quit();
  }

  console.log('');

  // Memory Usage
  console.log('4️⃣ System Information...');
  const memUsage = process.memoryUsage();
  const used = Math.round(memUsage.heapUsed / 1024 / 1024);
  const total = Math.round(memUsage.heapTotal / 1024 / 1024);
  const percentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  console.log(`   Memory Usage: ${used}MB / ${total}MB (${percentage}%)`);
  console.log(`   Uptime: ${Math.round(process.uptime())}s`);

  console.log('\n✨ Test Complete!\n');

  // Cleanup
  await prisma.$disconnect();
  process.exit(0);
}

testMonitoring().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
