// 買主リンケージデータのキャッシュサービス
import redis from '../config/redis';
import { BuyerSummary } from './BuyerLinkageService';

const CACHE_KEY_BUYER_COUNT = 'buyer_count:';
const CACHE_KEY_BUYER_LIST = 'buyer_list:';
const CACHE_KEY_HIGH_CONFIDENCE = 'high_confidence:';
const CACHE_TTL = 3600; // 1 hour (as per design specification)

export interface CacheEntry {
  property_number: string;
  buyer_count: number;
  cached_at: Date;
  expires_at: Date;
}

export class BuyerLinkageCache {
  /**
   * 買主カウントをキャッシュから取得
   */
  async getBuyerCount(propertyNumber: string): Promise<number | null> {
    try {
      const entry = await this.getBuyerCountEntry(propertyNumber);
      return entry ? entry.buyer_count : null;
    } catch (error) {
      console.error('Failed to get buyer count from cache:', error);
      return null;
    }
  }

  /**
   * 買主カウントをキャッシュに設定
   */
  async setBuyerCount(propertyNumber: string, count: number, ttl: number = CACHE_TTL): Promise<void> {
    try {
      const cached_at = new Date();
      const expires_at = new Date(cached_at.getTime() + ttl * 1000);
      
      const entry: CacheEntry = {
        property_number: propertyNumber,
        buyer_count: count,
        cached_at,
        expires_at
      };
      
      await redis.setEx(
        `${CACHE_KEY_BUYER_COUNT}${propertyNumber}`,
        ttl,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error('Failed to set buyer count in cache:', error);
    }
  }

  /**
   * 買主カウントのキャッシュエントリを取得（タイムスタンプ情報を含む）
   */
  async getBuyerCountEntry(propertyNumber: string): Promise<CacheEntry | null> {
    try {
      const cached = await redis.get(`${CACHE_KEY_BUYER_COUNT}${propertyNumber}`);
      if (!cached) return null;
      
      // 古い形式（数値のみ）との互換性を保つ
      if (!cached.startsWith('{')) {
        return {
          property_number: propertyNumber,
          buyer_count: parseInt(cached),
          cached_at: new Date(),
          expires_at: new Date(Date.now() + CACHE_TTL * 1000)
        };
      }
      
      const entry = JSON.parse(cached);
      return {
        ...entry,
        cached_at: new Date(entry.cached_at),
        expires_at: new Date(entry.expires_at)
      };
    } catch (error) {
      console.error('Failed to get buyer count entry from cache:', error);
      return null;
    }
  }

  /**
   * 買主リストをキャッシュから取得
   */
  async getBuyerList(propertyNumber: string): Promise<BuyerSummary[] | null> {
    try {
      const cached = await redis.get(`${CACHE_KEY_BUYER_LIST}${propertyNumber}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get buyer list from cache:', error);
      return null;
    }
  }

  /**
   * 買主リストをキャッシュに設定
   */
  async setBuyerList(propertyNumber: string, buyers: BuyerSummary[]): Promise<void> {
    try {
      await redis.setEx(
        `${CACHE_KEY_BUYER_LIST}${propertyNumber}`,
        CACHE_TTL,
        JSON.stringify(buyers)
      );
    } catch (error) {
      console.error('Failed to set buyer list in cache:', error);
    }
  }

  /**
   * 高確度買主フラグをキャッシュから取得
   */
  async getHighConfidenceFlag(propertyNumber: string): Promise<boolean | null> {
    try {
      const cached = await redis.get(`${CACHE_KEY_HIGH_CONFIDENCE}${propertyNumber}`);
      return cached ? cached === 'true' : null;
    } catch (error) {
      console.error('Failed to get high confidence flag from cache:', error);
      return null;
    }
  }

  /**
   * 高確度買主フラグをキャッシュに設定
   */
  async setHighConfidenceFlag(propertyNumber: string, hasHighConfidence: boolean): Promise<void> {
    try {
      await redis.setEx(
        `${CACHE_KEY_HIGH_CONFIDENCE}${propertyNumber}`,
        CACHE_TTL,
        hasHighConfidence.toString()
      );
    } catch (error) {
      console.error('Failed to set high confidence flag in cache:', error);
    }
  }

  /**
   * 特定物件のキャッシュを無効化
   */
  async invalidate(propertyNumber: string): Promise<void> {
    try {
      await Promise.all([
        redis.del(`${CACHE_KEY_BUYER_COUNT}${propertyNumber}`),
        redis.del(`${CACHE_KEY_BUYER_LIST}${propertyNumber}`),
        redis.del(`${CACHE_KEY_HIGH_CONFIDENCE}${propertyNumber}`)
      ]);
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }

  /**
   * すべての買主関連キャッシュを無効化
   */
  async invalidateAll(): Promise<void> {
    try {
      const keys = await redis.keys(`${CACHE_KEY_BUYER_COUNT}*`);
      const listKeys = await redis.keys(`${CACHE_KEY_BUYER_LIST}*`);
      const confidenceKeys = await redis.keys(`${CACHE_KEY_HIGH_CONFIDENCE}*`);
      
      const allKeys = [...keys, ...listKeys, ...confidenceKeys];
      
      if (allKeys.length > 0) {
        await Promise.all(allKeys.map(key => redis.del(key)));
      }
    } catch (error) {
      console.error('Failed to invalidate all cache:', error);
    }
  }

  /**
   * 複数物件の買主カウントをキャッシュから一括取得
   */
  async getBuyerCounts(propertyNumbers: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    
    try {
      await Promise.all(
        propertyNumbers.map(async (propNum) => {
          const count = await this.getBuyerCount(propNum);
          if (count !== null) {
            counts.set(propNum, count);
          }
        })
      );
    } catch (error) {
      console.error('Failed to get buyer counts from cache:', error);
    }
    
    return counts;
  }

  /**
   * 複数物件の買主カウントをキャッシュに一括設定
   */
  async setBuyerCounts(counts: Map<string, number>): Promise<void> {
    try {
      await Promise.all(
        Array.from(counts.entries()).map(([propNum, count]) =>
          this.setBuyerCount(propNum, count)
        )
      );
    } catch (error) {
      console.error('Failed to set buyer counts in cache:', error);
    }
  }
}
