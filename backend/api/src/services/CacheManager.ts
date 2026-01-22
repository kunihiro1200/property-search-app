import redisClient from '../config/redis';

/**
 * キャッシュエントリーのメタデータ
 */
export interface CacheMetadata {
  timestamp: Date;
  version: string;
  ttl: number;
}

/**
 * キャッシュされたデータ
 */
export interface CachedData<T = any> {
  data: T;
  metadata: CacheMetadata;
}

/**
 * 鮮度ステータス
 */
export interface FreshnessStatus {
  lastUpdateTime: Date | null;
  isStale: boolean;
  ageInMinutes: number;
}

/**
 * キャッシュ管理サービス
 * Redisキャッシュの読み書きと鮮度管理を担当
 */
export class CacheManager {
  private readonly VERSION = '1.0.0';
  private readonly DEFAULT_TTL = 300; // 5分

  /**
   * キャッシュからデータを取得
   */
  async get<T>(key: string): Promise<CachedData<T> | null> {
    try {
      const rawData = await redisClient.get(key);
      if (!rawData) return null;

      const cachedData = JSON.parse(rawData) as CachedData<T>;
      
      // タイムスタンプをDateオブジェクトに変換
      cachedData.metadata.timestamp = new Date(cachedData.metadata.timestamp);
      
      return cachedData;
    } catch (error) {
      console.error('CacheManager get error:', error);
      return null;
    }
  }

  /**
   * キャッシュにデータを保存
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const cachedData: CachedData<T> = {
        data,
        metadata: {
          timestamp: new Date(),
          version: this.VERSION,
          ttl,
        },
      };

      await redisClient.setEx(key, ttl, JSON.stringify(cachedData));
    } catch (error) {
      console.error('CacheManager set error:', error);
      throw error;
    }
  }


  /**
   * 最終更新時刻を取得
   */
  async getLastUpdateTime(key: string): Promise<Date | null> {
    try {
      const cachedData = await this.get(key);
      return cachedData?.metadata.timestamp || null;
    } catch (error) {
      console.error('CacheManager getLastUpdateTime error:', error);
      return null;
    }
  }

  /**
   * キャッシュを無効化（削除）
   */
  async invalidate(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('CacheManager invalidate error:', error);
      throw error;
    }
  }

  /**
   * パターンに一致するキャッシュを無効化
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redisClient.del(key)));
      }
    } catch (error) {
      console.error('CacheManager invalidatePattern error:', error);
      throw error;
    }
  }

  /**
   * キャッシュの鮮度をチェック
   * @param key キャッシュキー
   * @param thresholdMinutes 鮮度の閾値（分）
   */
  async checkFreshness(key: string, thresholdMinutes: number = 5): Promise<FreshnessStatus> {
    try {
      const cachedData = await this.get(key);
      
      if (!cachedData) {
        return {
          lastUpdateTime: null,
          isStale: true,
          ageInMinutes: Infinity,
        };
      }

      const now = new Date();
      const lastUpdateTime = cachedData.metadata.timestamp;
      const ageInMs = now.getTime() - lastUpdateTime.getTime();
      const ageInMinutes = ageInMs / (1000 * 60);
      const isStale = ageInMinutes >= thresholdMinutes;

      return {
        lastUpdateTime,
        isStale,
        ageInMinutes,
      };
    } catch (error) {
      console.error('CacheManager checkFreshness error:', error);
      return {
        lastUpdateTime: null,
        isStale: true,
        ageInMinutes: Infinity,
      };
    }
  }

  /**
   * キャッシュキーを生成
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * キャッシュが存在するかチェック
   */
  async exists(key: string): Promise<boolean> {
    try {
      const data = await redisClient.get(key);
      return data !== null;
    } catch (error) {
      console.error('CacheManager exists error:', error);
      return false;
    }
  }
}

// シングルトンインスタンス
export const cacheManager = new CacheManager();
