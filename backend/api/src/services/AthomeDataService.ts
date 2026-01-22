import { GoogleSheetsClient } from './GoogleSheetsClient';
import { GyomuListService } from './GyomuListService';

export interface AthomeDataResult {
  data: string[];  // Non-empty cell values
  propertyType: string;
  cached: boolean;
}

/**
 * Athomeデータ取得サービス
 * 
 * 業務リスト（業務依頼シート）の「格納先URL」からGoogle DriveフォルダURLを取得し、
 * そのフォルダ内の画像URLを取得します。
 * 
 * 注: 現在は格納先URLのみを返します。画像URL一覧の取得は今後実装予定。
 */
export class AthomeDataService {
  private gyomuListService: GyomuListService;
  private cache: Map<string, { data: string[]; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.gyomuListService = new GyomuListService();
    this.cache = new Map();
  }
  
  /**
   * 物件番号とタイプからAthomeデータを取得
   * 
   * @param propertyNumber 物件番号（例: AA12345）
   * @param propertyType 物件タイプ（土地/戸建て/マンション）
   * @param storageLocation 格納先URL（使用しない - 互換性のため残す）
   * @returns Athomeデータと物件タイプ
   */
  async getAthomeData(
    propertyNumber: string,
    propertyType: string,
    storageLocation: string | null = null
  ): Promise<AthomeDataResult> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(propertyNumber);
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData) {
        console.log(`[AthomeDataService] Cache hit for ${propertyNumber}`);
        return { data: cachedData, propertyType, cached: true };
      }
      
      // 業務リストから格納先URLを取得
      const gyomuData = await this.gyomuListService.getByPropertyNumber(propertyNumber);
      
      if (!gyomuData || !gyomuData.storageUrl) {
        console.log(`[AthomeDataService] No storage URL for ${propertyNumber} in 業務リスト`);
        return { data: [], propertyType, cached: false };
      }
      
      // 現在は格納先URLのみを返す
      // TODO: Google Drive APIを使用してフォルダ内の画像URL一覧を取得
      const data = [gyomuData.storageUrl];
      
      // Cache the result
      this.setCachedData(cacheKey, data);
      
      console.log(`[AthomeDataService] Fetched storage URL for ${propertyNumber}`);
      return { data, propertyType, cached: false };
    } catch (error: any) {
      console.error(`[AthomeDataService] Failed to get athome data for ${propertyNumber}:`, error.message);
      return { data: [], propertyType, cached: false };
    }
  }
  
  
  /**
   * キャッシュキーを生成
   * 
   * @param propertyNumber 物件番号
   * @returns キャッシュキー
   */
  private getCacheKey(propertyNumber: string): string {
    return `athome:${propertyNumber}`;
  }
  
  /**
   * キャッシュからデータを取得
   * 
   * @param cacheKey キャッシュキー
   * @returns キャッシュされたデータまたはnull
   */
  private getCachedData(cacheKey: string): string[] | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * データをキャッシュに保存
   * 
   * @param cacheKey キャッシュキー
   * @param data データ
   */
  private setCachedData(cacheKey: string, data: string[]): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }
}
