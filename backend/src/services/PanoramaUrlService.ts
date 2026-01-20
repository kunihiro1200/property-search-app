import { GoogleSheetsClient } from './GoogleSheetsClient';
import { GyomuListService } from './GyomuListService';
import { google } from 'googleapis';

/**
 * パノラマURL取得サービス
 * 
 * 業務リストの「スプシURL」から個別物件スプレッドシートを取得し、
 * athomeシートのN1セルからパノラマURLを取得します。
 * 
 * フォールバック: スプシURLがない場合は、業務依頼のドライブから
 * 物件番号を含むスプレッドシートを検索します。
 */
export class PanoramaUrlService {
  private gyomuListService: GyomuListService;
  private cache: Map<string, { url: string | null; timestamp: number }>;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10分
  
  constructor() {
    this.gyomuListService = new GyomuListService();
    this.cache = new Map();
  }
  
  /**
   * 物件番号からパノラマURLを取得
   * 
   * @param propertyNumber 物件番号（例: AA10528）
   * @returns パノラマURL（存在しない場合はnull）
   */
  async getPanoramaUrl(propertyNumber: string): Promise<string | null> {
    try {
      // キャッシュチェック
      const cached = this.getCachedData(propertyNumber);
      if (cached !== undefined) {
        console.log(`[PanoramaUrlService] Cache hit for ${propertyNumber}`);
        return cached;
      }
      
      // 業務リストからスプシURLを取得
      const gyomuData = await this.gyomuListService.getByPropertyNumber(propertyNumber);
      
      let spreadsheetUrl: string | null = null;
      
      if (gyomuData?.spreadsheetUrl) {
        console.log(`[PanoramaUrlService] Found spreadsheet URL in 業務リスト for ${propertyNumber}`);
        spreadsheetUrl = gyomuData.spreadsheetUrl;
      } else {
        console.log(`[PanoramaUrlService] No spreadsheet URL in 業務リスト, searching Drive for ${propertyNumber}`);
        // フォールバック: Driveから検索
        spreadsheetUrl = await this.searchSpreadsheetInDrive(propertyNumber);
      }
      
      if (!spreadsheetUrl) {
        console.log(`[PanoramaUrlService] No spreadsheet found for ${propertyNumber}`);
        this.setCachedData(propertyNumber, null);
        return null;
      }
      
      // スプレッドシートIDを抽出
      const spreadsheetId = this.extractSpreadsheetId(spreadsheetUrl);
      if (!spreadsheetId) {
        console.log(`[PanoramaUrlService] Invalid spreadsheet URL for ${propertyNumber}`);
        this.setCachedData(propertyNumber, null);
        return null;
      }
      
      // athomeシートのN1セルからパノラマURLを取得
      const panoramaUrl = await this.getPanoramaUrlFromSheet(spreadsheetId);
      
      // キャッシュに保存
      this.setCachedData(propertyNumber, panoramaUrl);
      
      if (panoramaUrl) {
        console.log(`[PanoramaUrlService] Found panorama URL for ${propertyNumber}`);
      } else {
        console.log(`[PanoramaUrlService] No panorama URL in N1 cell for ${propertyNumber}`);
      }
      
      return panoramaUrl;
      
    } catch (error: any) {
      console.error(`[PanoramaUrlService] Error getting panorama URL for ${propertyNumber}:`, error.message);
      return null;
    }
  }
  
  /**
   * スプレッドシートURLからIDを抽出
   * 
   * @param url スプレッドシートURL
   * @returns スプレッドシートID
   */
  private extractSpreadsheetId(url: string): string | null {
    try {
      // https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit...
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * athomeシートのN1セルからパノラマURLを取得
   * 
   * @param spreadsheetId スプレッドシートID
   * @returns パノラマURL（存在しない場合はnull）
   */
  private async getPanoramaUrlFromSheet(spreadsheetId: string): Promise<string | null> {
    try {
      const sheetsClient = new GoogleSheetsClient({
        spreadsheetId,
        sheetName: 'athome',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      });
      
      await sheetsClient.authenticate();
      
      // N1セルを読み取り（複数のシート名パターンを試す）
      const sheets = google.sheets({ version: 'v4', auth: sheetsClient['auth'] });
      
      // シート名のパターン（末尾スペースを含む）
      // 実際のシート名は "athome " のように末尾にスペースがある場合が多い
      const sheetNamePatterns = [
        'athome ',    // 末尾スペース1つ
        'athome  ',   // 末尾スペース2つ
        'athome',     // スペースなし
        'Athome ',
        'Athome  ',
        'Athome',
        'ATHOME ',
        'ATHOME  ',
        'ATHOME',
        'at home ',
        'At Home ',
      ];
      
      for (const sheetName of sheetNamePatterns) {
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!N1`,
          });
          
          const value = response.data.values?.[0]?.[0];
          
          if (value && typeof value === 'string' && value.trim()) {
            console.log(`[PanoramaUrlService] Found panorama URL in sheet "${sheetName}"`);
            return value.trim();
          }
        } catch (error: any) {
          // このシート名では見つからなかったので次を試す
          continue;
        }
      }
      
      return null;
      
    } catch (error: any) {
      console.error(`[PanoramaUrlService] Error reading N1 cell from spreadsheet ${spreadsheetId}:`, error.message);
      return null;
    }
  }
  
  /**
   * Google Driveから物件番号を含むスプレッドシートを検索
   * 
   * @param propertyNumber 物件番号
   * @returns スプレッドシートURL（見つからない場合はnull）
   */
  private async searchSpreadsheetInDrive(propertyNumber: string): Promise<string | null> {
    try {
      // サービスアカウント認証
      const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
      const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      
      const drive = google.drive({ version: 'v3', auth });
      
      // 業務依頼フォルダIDを取得（環境変数から）
      const gyomuFolderId = process.env.GYOMU_FOLDER_ID;
      
      if (!gyomuFolderId) {
        console.log('[PanoramaUrlService] GYOMU_FOLDER_ID not set, skipping Drive search');
        return null;
      }
      
      // フォルダ内で物件番号を含むスプレッドシートを検索
      const query = `'${gyomuFolderId}' in parents and name contains '${propertyNumber}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
      
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        pageSize: 1,
      });
      
      const files = response.data.files;
      
      if (files && files.length > 0) {
        const fileId = files[0].id;
        console.log(`[PanoramaUrlService] Found spreadsheet in Drive: ${files[0].name}`);
        return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
      }
      
      return null;
      
    } catch (error: any) {
      console.error(`[PanoramaUrlService] Error searching Drive for ${propertyNumber}:`, error.message);
      return null;
    }
  }
  
  /**
   * キャッシュからデータを取得
   */
  private getCachedData(propertyNumber: string): string | null | undefined {
    const cached = this.cache.get(propertyNumber);
    if (!cached) return undefined;
    
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(propertyNumber);
      return undefined;
    }
    
    return cached.url;
  }
  
  /**
   * データをキャッシュに保存
   */
  private setCachedData(propertyNumber: string, url: string | null): void {
    this.cache.set(propertyNumber, {
      url,
      timestamp: Date.now(),
    });
  }
}
