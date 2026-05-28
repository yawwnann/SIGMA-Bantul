import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private useFallback = false;

  constructor(private configService: ConfigService) {
    // Check Upstash credentials first
    const upstashUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const upstashToken = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (upstashUrl && upstashToken) {
      // Try Upstash REST API via HTTP client
      this.useFallback = false;
      // Note: For production, install @upstash/redis
      console.log('Redis: Config found, using fallback mode (no cache)');
    } else {
      // Try local/ioredis connection
      const redisConfig: any = {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      };

      const password = this.configService.get<string>('REDIS_PASSWORD');
      if (password) {
        redisConfig.password = password;
      }

      try {
        this.client = new Redis(redisConfig);
        this.client.on('connect', () => {
          console.log('Redis: Connected');
        });
        this.client.on('error', (err) => {
          console.warn('Redis: Connection error (caching disabled):', err.message);
        });
      } catch {
        console.warn('Redis: Failed to initialize, caching disabled');
        this.useFallback = true;
      }
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  // Fallback methods when Redis unavailable
  async get(key: string): Promise<string | null> {
    if (this.useFallback || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (this.useFallback || !this.client) return;
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Silently fail - caching is optional
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    return this.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    if (this.useFallback || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Silently fail
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (this.useFallback || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        for (const key of keys) {
          await this.client.del(key);
        }
      }
    } catch {
      // Silently fail
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.useFallback || !this.client) return [];
    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }
}
