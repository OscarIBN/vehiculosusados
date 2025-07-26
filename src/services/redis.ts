import { createClient, RedisClientType } from 'redis';
import { RedisConfig } from '@/types';

export class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD;

    const redisConfig: RedisConfig = password ? { host, port, password } : { host, port };

    this.client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      ...(redisConfig.password && { password: redisConfig.password }),
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await this.connect();
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.connect();
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.connect();
      await this.client.flushAll();
    } catch (error) {
      console.error('Redis FLUSHALL error:', error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error);
      return false;
    }
  }

  // Cache utility methods
  async setCache(key: string, data: any, ttl: number = 300): Promise<void> {
    const serialized = JSON.stringify(data);
    await this.set(key, serialized, ttl);
  }

  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (data) {
      try {
        return JSON.parse(data) as T;
      } catch (error) {
        console.error('Cache deserialization error:', error);
        return null;
      }
    }
    return null;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      await this.connect();
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Redis pattern invalidation error:', error);
      throw error;
    }
  }
}

export const redisService = new RedisService(); 