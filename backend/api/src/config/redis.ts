import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis互換インターフェース
interface RedisLike {
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<string | null>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

// メモリ内セッションストア（Redisが利用できない場合のフォールバック）
class MemoryStore implements RedisLike {
  private store: Map<string, { value: string; expiresAt: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
    return null;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    // 簡易的なパターンマッチング（*のみサポート）
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }
}

// RedisClientTypeをRedisLikeに適合させるラッパー
class RedisClientWrapper implements RedisLike {
  constructor(private client: any) {} // 型チェックをスキップ

  async get(key: string): Promise<string | null> {
    const result = await this.client.get(key);
    return result as string | null;
  }

  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    await this.client.setEx(key, seconds, value);
    return null;
  }

  async del(key: string): Promise<number> {
    const result = await this.client.del(key);
    return result as number;
  }

  async keys(pattern: string): Promise<string[]> {
    const result = await this.client.keys(pattern);
    return result as string[];
  }
}

let redisClient: RedisLike;
let isRedisConnected = false;

const initRedis = async () => {
  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: false, // 再接続を無効化
      },
    });

    // エラーハンドラーを先に設定（接続前）
    client.on('error', () => {
      // エラーは無視（フォールバックを使用）
    });

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 2000)
      ),
    ]);
    
    console.log('✅ Redis connected');
    isRedisConnected = true;
    redisClient = new RedisClientWrapper(client);
  } catch (error) {
    console.warn('⚠️ Redis not available, using in-memory session store');
    redisClient = new MemoryStore();
    isRedisConnected = false;
  }
};

export const connectRedis = async () => {
  await initRedis();
};

export const getRedisClient = (): RedisLike => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export default {
  get: async (key: string): Promise<string | null> => getRedisClient().get(key),
  setEx: async (key: string, seconds: number, value: string): Promise<string | null> => 
    getRedisClient().setEx(key, seconds, value),
  del: async (key: string): Promise<number> => getRedisClient().del(key),
  keys: async (pattern: string): Promise<string[]> => getRedisClient().keys(pattern),
};
