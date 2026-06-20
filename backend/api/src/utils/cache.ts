import redisClient from '../config/redis';

/**
 * キャッシュヘルパー
 */
export class CacheHelper {
  /**
   * キャッシュからデータを取得
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * キャッシュにデータを保存
   */
  static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * キャッシュを削除
   */
  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  /**
   * パターンに一致するキャッシュを削除
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisClient.del(key)));
      }
    } catch (error) {
      console.error('Cache delPattern error:', error);
    }
  }

  /**
   * キャッシュキーを生成
   */
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}

/**
 * キャッシュTTL定数（秒）
 */
export const CACHE_TTL = {
  SELLER_LIST: 60, // 1分
  SELLER_DETAIL: 300, // 5分
  VALUATION: 600, // 10分
  STATISTICS: 300, // 5分
  SESSION: 86400, // 24時間
};
