import { GoogleSheetsClient } from './GoogleSheetsClient';
import { GyomuListService } from './GyomuListService';

export interface AthomeDataResult {
  data: string[];  // [フォルダURL, パノラマURL]
  propertyType: string;
  cached: boolean;
}

/**
 * Athomeデータ取得サービス
 * 
 * 業務リスト（業務依頼シート）の「格納先URL」からGoogle DriveフォルダURLを取得し、
 * スプレッドシートの「athome!N1」セルからパノラマURLを取得します。
 * 
 * 戻り値: [フォルダURL, パノラマURL]
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
      
      // 業務リストから格納先URLとスプシURLを取得
      const gyomuData = await this.gyomuListService.getByPropertyNumber(propertyNumber);
      
      if (!gyomuData) {
        console.log(`[AthomeDataService] No data for ${propertyNumber} in 業務リスト`);
        return { data: [], propertyType, cached: false };
      }
      
      const folderUrl = gyomuData.storageUrl || '';
      let panoramaUrl = '';
      
      // スプシURLが存在する場合、パノラマURLを取得
      if (gyomuData.spreadsheetUrl) {
        panoramaUrl = await this.getPanoramaUrlFromSpreadsheet(
          propertyNumber,
          gyomuData.spreadsheetUrl
        );
      }
      
      // [フォルダURL, パノラマURL] の配列を返す
      const data = [folderUrl, panoramaUrl];
      
      // Cache the result
      this.setCachedData(cacheKey, data);
      
      console.log(`[AthomeDataService] Fetched data for ${propertyNumber}: folder=${!!folderUrl}, panorama=${!!panoramaUrl}`);
      return { data, propertyType, cached: false };
    } catch (error: any) {
      console.error(`[AthomeDataService] Failed to get athome data for ${propertyNumber}:`, error.message);
      return { data: [], propertyType, cached: false };
    }
  }
  
  /**
   * スプレッドシートからパノラマURLを取得
   * 
   * @param propertyNumber 物件番号
   * @param spreadsheetUrl スプレッドシートURL
   * @returns パノラマURL（存在しない場合は空文字列）
   */
  private async getPanoramaUrlFromSpreadsheet(
    propertyNumber: string,
    spreadsheetUrl: string
  ): Promise<string> {
    try {
      // スプレッドシートIDを抽出
      const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!spreadsheetIdMatch) {
        console.log(`[AthomeDataService] Invalid spreadsheet URL for ${propertyNumber}`);
        return '';
      }
      
      const spreadsheetId = spreadsheetIdMatch[1];
      
      // GoogleSheetsClientを初期化
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId: spreadsheetId,
        sheetName: 'athome', // デフォルトのシート名
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      });
      
      await sheetsClient.authenticate();
      
      // シート一覧を取得して「athome」シートを探す（前後の空白を考慮）
      const { google } = require('googleapis');
      const auth = sheetsClient['auth']; // privateプロパティにアクセス
      const sheets = google.sheets({ version: 'v4', auth });
      
      const metadataResponse = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });
      
      const sheetList = metadataResponse.data.sheets || [];
      let athomeSheetName = 'athome'; // デフォルト
      
      // 「athome」を含むシート名を探す（前後の空白を考慮）
      for (const sheet of sheetList) {
        const sheetTitle = sheet.properties?.title || '';
        if (sheetTitle.trim().toLowerCase() === 'athome') {
          athomeSheetName = sheetTitle; // 実際のシート名を使用
          console.log(`[AthomeDataService] Found athome sheet: "${athomeSheetName}" for ${propertyNumber}`);
          break;
        }
      }
      
      // N1セルからパノラマURLを取得
      const range = `${athomeSheetName}!N1`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
        valueRenderOption: 'UNFORMATTED_VALUE',
      });
      
      const values = response.data.values;
      
      if (!values || values.length === 0 || values[0].length === 0) {
        console.log(`[AthomeDataService] N1 cell is empty for ${propertyNumber}`);
        return '';
      }
      
      const panoramaUrl = String(values[0][0]).trim();
      
      if (panoramaUrl) {
        console.log(`[AthomeDataService] Found panorama URL for ${propertyNumber}`);
        return panoramaUrl;
      }
      
      return '';
      
    } catch (error: any) {
      console.error(`[AthomeDataService] Failed to get panorama URL for ${propertyNumber}:`, error.message);
      return '';
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
