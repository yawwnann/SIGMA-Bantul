import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private ioClient: Redis | null = null;
  private upstashClient: UpstashRedis | null = null;
  private useFallback = false;

  constructor(private configService: ConfigService) {
    const upstashUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const upstashToken = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (upstashUrl && upstashToken) {
      try {
        this.upstashClient = new UpstashRedis({
          url: upstashUrl,
          token: upstashToken,
        });
        console.log('Redis: Connected to Upstash REST API');
      } catch (err) {
        console.warn('Redis: Failed to initialize Upstash:', err);
        this.useFallback = true;
      }
    } else {
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
        this.ioClient = new Redis(redisConfig);
        this.ioClient.on('connect', () => {
          console.log('Redis: Connected to standard Redis');
        });
        this.ioClient.on('error', (err) => {
          console.warn('Redis: Connection error (caching disabled):', err.message);
        });
      } catch {
        console.warn('Redis: Failed to initialize ioredis, caching disabled');
        this.useFallback = true;
      }
    }
  }

  async onModuleDestroy() {
    if (this.ioClient) {
      await this.ioClient.quit().catch(() => {});
    }
    // Upstash REST client does not require explicitly closing connections
  }

  async get(key: string): Promise<string | null> {
    if (this.useFallback) return null;
    try {
      if (this.upstashClient) {
        const data = await this.upstashClient.get<any>(key);
        if (data === null || data === undefined) return null;
        // Upstash auto-parses JSON, so we convert back to string if needed to match interface
        return typeof data === 'object' ? JSON.stringify(data) : String(data);
      } else if (this.ioClient) {
        return await this.ioClient.get(key);
      }
    } catch {
      return null;
    }
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (this.useFallback) return;
    try {
      if (this.upstashClient) {
        if (ttl) {
          await this.upstashClient.setex(key, ttl, value);
        } else {
          await this.upstashClient.set(key, value);
        }
      } else if (this.ioClient) {
        if (ttl) {
          await this.ioClient.setex(key, ttl, value);
        } else {
          await this.ioClient.set(key, value);
        }
      }
    } catch {
      // Silently fail
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    return this.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    if (this.useFallback) return;
    try {
      if (this.upstashClient) {
        await this.upstashClient.del(key);
      } else if (this.ioClient) {
        await this.ioClient.del(key);
      }
    } catch {
      // Silently fail
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (this.useFallback) return;
    try {
      if (this.upstashClient) {
        const keys = await this.upstashClient.keys(pattern);
        if (keys && keys.length > 0) {
          await this.upstashClient.del(...keys);
        }
      } else if (this.ioClient) {
        const keys = await this.ioClient.keys(pattern);
        if (keys && keys.length > 0) {
          for (const key of keys) {
            await this.ioClient.del(key);
          }
        }
      }
    } catch {
      // Silently fail
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.useFallback) return [];
    try {
      if (this.upstashClient) {
        return await this.upstashClient.keys(pattern);
      } else if (this.ioClient) {
        return await this.ioClient.keys(pattern);
      }
    } catch {
      return [];
    }
    return [];
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (this.useFallback) return null;
    try {
      if (this.upstashClient) {
        // Upstash auto parses, so we can directly return it
        return await this.upstashClient.get<T>(key);
      } else if (this.ioClient) {
        const data = await this.ioClient.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
      }
    } catch {
      return null;
    }
    return null;
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (this.useFallback) return;
    try {
      if (this.upstashClient) {
        if (ttl) {
          await this.upstashClient.setex(key, ttl, value);
        } else {
          await this.upstashClient.set(key, value);
        }
      } else if (this.ioClient) {
        await this.set(key, JSON.stringify(value), ttl);
      }
    } catch {
      // Silently fail
    }
  }
}
