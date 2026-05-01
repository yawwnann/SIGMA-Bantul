import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRedisConnection() {
  console.log('🔌 Testing Redis Cloud connection...\n');

  const redisConfig: any = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: 3,
  };

  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }

  if (process.env.REDIS_USERNAME) {
    redisConfig.username = process.env.REDIS_USERNAME;
  }

  console.log('📋 Configuration:');
  console.log(`   Host: ${redisConfig.host}`);
  console.log(`   Port: ${redisConfig.port}`);
  console.log(`   Username: ${redisConfig.username || 'none'}`);
  console.log(
    `   Password: ${redisConfig.password ? '***' + redisConfig.password.slice(-4) : 'none'}\n`,
  );

  const client = new Redis(redisConfig);

  client.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    process.exit(1);
  });

  client.on('connect', () => {
    console.log('✅ Redis connected successfully!\n');
  });

  try {
    // Test PING
    console.log('🏓 Testing PING...');
    const pong = await client.ping();
    console.log(`   Response: ${pong}\n`);

    // Test SET
    console.log('💾 Testing SET...');
    await client.set('test:connection', 'Hello from GIS Bantul!', 'EX', 60);
    console.log('   ✅ SET successful\n');

    // Test GET
    console.log('📖 Testing GET...');
    const value = await client.get('test:connection');
    console.log(`   Value: ${value}\n`);

    // Test INFO
    console.log('ℹ️  Getting Redis INFO...');
    const info = await client.info('memory');
    const lines = info.split('\r\n');
    const usedMemory = lines.find((line) =>
      line.startsWith('used_memory_human:'),
    );
    const maxMemory = lines.find((line) => line.startsWith('maxmemory_human:'));
    console.log(`   ${usedMemory}`);
    console.log(`   ${maxMemory}\n`);

    // Cleanup
    console.log('🧹 Cleaning up test key...');
    await client.del('test:connection');
    console.log('   ✅ Cleanup successful\n');

    console.log('✨ All tests passed! Redis Cloud is ready to use.\n');

    await client.quit();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await client.quit();
    process.exit(1);
  }
}

testRedisConnection();
