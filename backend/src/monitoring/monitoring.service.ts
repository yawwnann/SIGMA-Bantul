import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface PerformanceMetrics {
  timestamp: Date;
  redisLatency: number;
  databaseLatency: number;
  systemUptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface UserAccessMetrics {
  timestamp: Date;
  activeUsers: number;
  totalRequests: number;
  requestsPerMinute: number;
}

export interface RequestHistoryPoint {
  timestamp: Date;
  count: number; // Requests in this specific time window
}

@Injectable()
export class MonitoringService {
  private metricsHistory: PerformanceMetrics[] = [];
  private userAccessHistory: UserAccessMetrics[] = [];
  private requestHistory: RequestHistoryPoint[] = [];
  private lastRequestCount = 0; // Track previous count to calculate delta
  private readonly MAX_HISTORY = 50; // Reduced from 100 to save memory
  private readonly MAX_REQUEST_HISTORY = 60; // Keep 60 data points (5 minutes at 5s interval)

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    // Start collecting metrics every 5 seconds
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    setInterval(async () => {
      try {
        const metrics = await this.collectCurrentMetrics();
        this.metricsHistory.push(metrics);

        // Keep only last MAX_HISTORY items
        if (this.metricsHistory.length > this.MAX_HISTORY) {
          this.metricsHistory.shift();
        }

        // Track request count for history (calculate delta, not cumulative)
        const requestStats = (await this.redis.getJson<{
          total: number;
          lastMinute: number;
        }>('system:requests:stats')) || { total: 0, lastMinute: 0 };

        // Calculate requests in this 5-second interval
        const currentTotal = requestStats.total;
        const requestsInInterval = currentTotal - this.lastRequestCount;
        this.lastRequestCount = currentTotal;

        // Convert to requests per minute (multiply by 12 since we collect every 5 seconds)
        const requestsPerMinute = requestsInInterval * 12;

        this.requestHistory.push({
          timestamp: new Date(),
          count: requestsPerMinute, // Store as requests/minute
        });

        // Keep only last MAX_REQUEST_HISTORY items
        if (this.requestHistory.length > this.MAX_REQUEST_HISTORY) {
          this.requestHistory.shift();
        }

        // Store in Redis for persistence (shorter TTL to save memory)
        await this.redis.setJson('system:metrics:latest', metrics, 180);

        // Suggest garbage collection if memory is high (Node.js will decide)
        if (metrics.memoryUsage.percentage > 95) {
          if (global.gc) {
            global.gc();
            console.log(
              'Garbage collection triggered due to high memory usage',
            );
          }
        }
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, 5000);
  }

  async collectCurrentMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();

    // Measure Redis latency
    let redisLatency = 0;
    try {
      const redisStart = Date.now();
      await this.redis.get('health:check');
      redisLatency = Date.now() - redisStart;
    } catch (error) {
      console.error('Error measuring Redis latency:', error);
      redisLatency = -1;
    }

    // Measure Database latency
    let databaseLatency = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseLatency = Date.now() - dbStart;
    } catch (error) {
      console.error('Error measuring Database latency:', error);
      databaseLatency = -1;
    }

    // Get system info
    const memUsage = process.memoryUsage();
    const memoryUsage = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    };

    return {
      timestamp,
      redisLatency,
      databaseLatency,
      systemUptime: Math.round(process.uptime()),
      memoryUsage,
    };
  }

  async getPerformanceMetrics(minutes: number = 30) {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    // Get from memory
    const recentMetrics = this.metricsHistory.filter(
      (m) => m.timestamp >= cutoffTime,
    );

    // If not enough data in memory, get current metrics
    if (recentMetrics.length === 0) {
      const current = await this.collectCurrentMetrics();
      return [current];
    }

    return recentMetrics;
  }

  async getRedisStats() {
    try {
      const info = await this.redis.keys('*');
      const metrics = await this.collectCurrentMetrics();

      return {
        connected: true,
        latency: metrics.redisLatency,
        totalKeys: info.length,
        avgLatency: this.calculateAverageLatency('redis'),
        maxLatency: this.calculateMaxLatency('redis'),
      };
    } catch (error) {
      return {
        connected: false,
        latency: -1,
        totalKeys: 0,
        avgLatency: 0,
        maxLatency: 0,
        error: error.message,
      };
    }
  }

  async getDatabaseStats() {
    try {
      const metrics = await this.collectCurrentMetrics();

      // Get database size - with fallback
      let dbSize = 'Unknown';
      try {
        const sizeResult = await this.prisma.$queryRaw<Array<{ size: string }>>`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `;
        dbSize = sizeResult[0]?.size || 'Unknown';
      } catch (err) {
        console.error('Error getting database size:', err);
      }

      // Get active connections - with fallback
      let activeConnections = 0;
      try {
        const connections = await this.prisma.$queryRaw<
          Array<{ count: bigint }>
        >`
          SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
        `;
        activeConnections = Number(connections[0]?.count || 0);
      } catch (err) {
        console.error('Error getting active connections:', err);
      }

      // Get table stats - with fallback
      let topTables = [];
      try {
        const tableStats = await this.prisma.$queryRaw<
          Array<{
            table_name: string;
            row_count: bigint;
          }>
        >`
          SELECT 
            schemaname || '.' || relname as table_name,
            n_live_tup as row_count
          FROM pg_stat_user_tables
          ORDER BY n_live_tup DESC
          LIMIT 10
        `;
        topTables = tableStats.map((t) => ({
          name: t.table_name,
          rows: Number(t.row_count),
        }));
      } catch (err) {
        console.error('Error getting table stats:', err);
        // Fallback: try simpler query
        try {
          const simpleTables = await this.prisma.$queryRaw<
            Array<{
              table_name: string;
              row_count: bigint;
            }>
          >`
            SELECT 
              table_schema || '.' || table_name as table_name,
              0 as row_count
            FROM information_schema.tables
            WHERE table_schema = 'public'
            LIMIT 10
          `;
          topTables = simpleTables.map((t) => ({
            name: t.table_name,
            rows: Number(t.row_count),
          }));
        } catch (fallbackErr) {
          console.error('Fallback table query also failed:', fallbackErr);
        }
      }

      return {
        connected: true,
        latency: metrics.databaseLatency,
        avgLatency: this.calculateAverageLatency('database'),
        maxLatency: this.calculateMaxLatency('database'),
        size: dbSize,
        activeConnections,
        topTables,
      };
    } catch (error) {
      console.error('Database stats error:', error);
      return {
        connected: false,
        latency: -1,
        avgLatency: 0,
        maxLatency: 0,
        size: 'Unknown',
        activeConnections: 0,
        topTables: [],
        error: error.message,
      };
    }
  }

  async getUserAccessStats() {
    try {
      // Get active admin sessions from Redis (only admins login)
      const sessionKeys = await this.redis.keys('session:*');

      // Get total users in database (mostly admins and officers)
      const userActivity = await this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      });

      // Get request stats from Redis (public + admin requests)
      const requestStats = (await this.redis.getJson<{
        total: number;
        lastMinute: number;
      }>('system:requests:stats')) || { total: 0, lastMinute: 0 };

      return {
        activeSessions: sessionKeys.length, // Admin sessions only
        usersByRole: userActivity.map((u) => ({
          role: u.role,
          count: u._count.id,
        })),
        totalRequests: requestStats.total, // All API requests (public + admin)
        requestsPerMinute: requestStats.lastMinute,
      };
    } catch (error) {
      return {
        activeSessions: 0,
        usersByRole: [],
        totalRequests: 0,
        requestsPerMinute: 0,
        error: error.message,
      };
    }
  }

  async getSystemHealth() {
    const [redis, database, metrics] = await Promise.all([
      this.getRedisStats(),
      this.getDatabaseStats(),
      this.collectCurrentMetrics(),
    ]);

    // Determine overall health with realistic thresholds for Node.js heap memory
    // Node.js heap memory usage is typically higher than system memory
    // Consider healthy if:
    // - Both services connected
    // - Redis latency < 200ms (or -1 for error)
    // - Database latency < 200ms (or -1 for error)
    // - Memory usage < 98% (Node.js heap can be high, this is normal)
    const redisHealthy =
      redis.connected && (redis.latency < 200 || redis.latency === -1);
    const databaseHealthy =
      database.connected && (database.latency < 200 || database.latency === -1);
    const memoryHealthy = metrics.memoryUsage.percentage < 98;

    const isHealthy = redisHealthy && databaseHealthy && memoryHealthy;

    // Log health check details
    console.log('=== System Health Check ===');
    console.log('Redis:', {
      connected: redis.connected,
      latency: redis.latency,
      healthy: redisHealthy,
    });
    console.log('Database:', {
      connected: database.connected,
      latency: database.latency,
      healthy: databaseHealthy,
    });
    console.log('Memory:', {
      percentage: metrics.memoryUsage.percentage,
      healthy: memoryHealthy,
      note: 'Node.js heap memory (not system memory)',
    });
    console.log('Overall Status:', isHealthy ? 'HEALTHY' : 'DEGRADED');

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      uptime: metrics.systemUptime,
      memory: metrics.memoryUsage,
      services: {
        redis: {
          status: redis.connected ? 'up' : 'down',
          latency: redis.latency,
        },
        database: {
          status: database.connected ? 'up' : 'down',
          latency: database.latency,
        },
      },
    };
  }

  async getDetailedMetrics() {
    const [performance, redis, database, userAccess, health] =
      await Promise.all([
        this.getPerformanceMetrics(30),
        this.getRedisStats(),
        this.getDatabaseStats(),
        this.getUserAccessStats(),
        this.getSystemHealth(),
      ]);

    return {
      health,
      performance,
      redis,
      database,
      userAccess,
      requestHistory: this.requestHistory, // Add request history
      timestamp: new Date(),
    };
  }

  private calculateAverageLatency(type: 'redis' | 'database'): number {
    if (this.metricsHistory.length === 0) return 0;

    const sum = this.metricsHistory.reduce((acc, m) => {
      return acc + (type === 'redis' ? m.redisLatency : m.databaseLatency);
    }, 0);

    return Math.round(sum / this.metricsHistory.length);
  }

  private calculateMaxLatency(type: 'redis' | 'database'): number {
    if (this.metricsHistory.length === 0) return 0;

    return Math.max(
      ...this.metricsHistory.map((m) =>
        type === 'redis' ? m.redisLatency : m.databaseLatency,
      ),
    );
  }

  // Method to track requests (call this from a middleware/interceptor)
  async trackRequest() {
    try {
      const stats = (await this.redis.getJson<{
        total: number;
        lastMinute: number;
        lastUpdate: number;
      }>('system:requests:stats')) || {
        total: 0,
        lastMinute: 0,
        lastUpdate: Date.now(),
      };

      const now = Date.now();
      const oneMinute = 60 * 1000;

      // Reset lastMinute counter if more than 1 minute has passed
      if (now - stats.lastUpdate > oneMinute) {
        stats.lastMinute = 1;
      } else {
        stats.lastMinute++;
      }

      stats.total++;
      stats.lastUpdate = now;

      await this.redis.setJson('system:requests:stats', stats, 3600);
    } catch (error) {
      console.error('Error tracking request:', error);
    }
  }
}
