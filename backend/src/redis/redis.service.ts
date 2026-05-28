import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    const upstashUrl = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const upstashToken = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (upstashUrl && upstashToken) {
      // Use Upstash Redis
      this.client = new Redis({
        url: upstashUrl,
        token: upstashToken,
      });
      console.log('Redis: Using Upstash');
    } else {
      // Fallback to ioredis for local development
      const { Redis: IORedis } = require('ioredis');
      const redisConfig: any = {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        maxRetriesPerRequest: 3,
      };
      const password = this.configService.get<string>('REDIS_PASSWORD');
      if (password) {
        redisConfig.password = password;
      }
      const username = this.configService.get<string>('REDIS_USERNAME');
      if (username) {
        redisConfig.username = username;
      }
      this.client = new IORedis(redisConfig) as any;
      console.log('Redis: Using ioredis fallback');
    }
  }

  async onModuleDestroy() {
    if (typeof this.client.quit === 'function') {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, { ex: ttl });
    } else {
      await this.client.set(key, value);
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    await this.client.set(key, value, { ex: ttl });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await this.client.del(key);
      }
    }
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
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
