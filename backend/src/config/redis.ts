import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// メモリ内セッションストア（Redisが利用できない場合のフォールバック）
class MemoryStore {
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

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    // 簡易的なパターンマッチング（*のみサポート）
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }
}

let redisClient: RedisClientType | MemoryStore;
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
    redisClient = client;
  } catch (error) {
    console.warn('⚠️ Redis not available, using in-memory session store');
    redisClient = new MemoryStore();
    isRedisConnected = false;
  }
};

export const connectRedis = async () => {
  await initRedis();
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export default {
  get: async (key: string) => getRedisClient().get(key),
  setEx: async (key: string, seconds: number, value: string) => 
    getRedisClient().setEx(key, seconds, value),
  del: async (key: string) => getRedisClient().del(key),
  keys: async (pattern: string) => getRedisClient().keys(pattern),
};
