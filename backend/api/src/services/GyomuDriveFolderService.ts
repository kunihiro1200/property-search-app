import { google } from 'googleapis';
import path from 'path';

/**
 * 業務依頼Driveフォルダサービス
 * 
 * 業務依頼フォルダ内で物件番号を含むスプレッドシートを検索します。
 * 業務リスト（スプレッドシート）に存在しない物件のスプシURLを取得するために使用します。
 */
export class GyomuDriveFolderService {
  private drive: any;
  private readonly GYOMU_FOLDER_ID = '1d9oHRSQ1_UAC5XakBLijUsendj0ZxD4F';
  private cache: Map<string, string>; // propertyNumber -> spreadsheetUrl
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30分（フォルダ検索は重いのでキャッシュを長めに）

  constructor() {
    this.cache = new Map();
  }

  /**
   * Google Drive APIを初期化
   */
  private async initializeDrive(): Promise<void> {
    if (this.drive) {
      return;
    }

    try {
      const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
      const absolutePath = path.resolve(serviceAccountKeyPath);

      const auth = new google.auth.GoogleAuth({
        keyFile: absolutePath,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      const authClient = await auth.getClient();
      this.drive = google.drive({ version: 'v3', auth: authClient as any });
      
      console.log('[GyomuDriveFolderService] Google Drive initialized');
    } catch (error: any) {
      console.error('[GyomuDriveFolderService] Failed to initialize Google Drive:', error.message);
      throw error;
    }
  }

  /**
   * 物件番号を含むスプレッドシートURLを検索
   * 
   * @param propertyNumber 物件番号（例: AA12345）
   * @returns スプレッドシートURL、見つからない場合はnull
   */
  async findSpreadsheetByPropertyNumber(propertyNumber: string): Promise<string | null> {
    try {
      // キャッシュチェック
      if (Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
        const cached = this.cache.get(propertyNumber);
        if (cached) {
          console.log(`[GyomuDriveFolderService] Cache hit for ${propertyNumber}`);
          return cached;
        }
      }

      await this.initializeDrive();

      console.log(`[GyomuDriveFolderService] Searching for spreadsheet containing "${propertyNumber}" in folder ${this.GYOMU_FOLDER_ID}`);

      // 業務依頼フォルダ内で物件番号を含むスプレッドシートを検索
      // クエリ: フォルダ内 AND ファイル名に物件番号を含む AND スプレッドシート
      const query = `'${this.GYOMU_FOLDER_ID}' in parents and name contains '${propertyNumber}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, webViewLink)',
        pageSize: 10, // 通常は1件のはずだが、念のため複数取得
      });

      const files = response.data.files || [];

      if (files.length === 0) {
        console.log(`[GyomuDriveFolderService] No spreadsheet found for ${propertyNumber}`);
        return null;
      }

      if (files.length > 1) {
        console.warn(`[GyomuDriveFolderService] Multiple spreadsheets found for ${propertyNumber}:`, files.map((f: any) => f.name));
        // 複数見つかった場合は、物件番号が最も明確に含まれているものを選択
        const bestMatch = this.selectBestMatch(propertyNumber, files);
        if (bestMatch) {
          const url = bestMatch.webViewLink;
          console.log(`[GyomuDriveFolderService] Selected best match: ${bestMatch.name} -> ${url}`);
          this.cache.set(propertyNumber, url);
          this.cacheTimestamp = Date.now();
          return url;
        }
      }

      // 1件のみ見つかった場合
      const file = files[0];
      const url = file.webViewLink;
      console.log(`[GyomuDriveFolderService] Found spreadsheet: ${file.name} -> ${url}`);
      
      // キャッシュに保存
      this.cache.set(propertyNumber, url);
      this.cacheTimestamp = Date.now();

      return url;

    } catch (error: any) {
      console.error(`[GyomuDriveFolderService] Error searching for ${propertyNumber}:`, error.message);
      return null;
    }
  }

  /**
   * 複数のファイルから最適なマッチを選択
   * 
   * 物件番号が単語境界で区切られているファイルを優先
   * 例: "【AA12345】物件名" > "AA12345物件名" > "物件AA12345名"
   */
  private selectBestMatch(propertyNumber: string, files: any[]): any | null {
    // スコアリング: 物件番号の前後に区切り文字がある方が高スコア
    const scored = files.map((file: any) => {
      const name = file.name;
      let score = 0;

      // 物件番号の位置を探す
      const index = name.indexOf(propertyNumber);
      if (index === -1) {
        return { file, score: -1 };
      }

      // 前後の文字をチェック
      const before = index > 0 ? name[index - 1] : '';
      const after = index + propertyNumber.length < name.length ? name[index + propertyNumber.length] : '';

      // 区切り文字（スペース、括弧、アンダースコアなど）があればスコア加算
      const separators = [' ', '　', '【', '】', '(', ')', '[', ']', '_', '-', '・'];
      
      if (index === 0 || separators.includes(before)) {
        score += 10;
      }
      
      if (index + propertyNumber.length === name.length || separators.includes(after)) {
        score += 10;
      }

      // ファイル名の先頭に近いほど高スコア
      if (index < 10) {
        score += 5;
      }

      return { file, score };
    });

    // スコアでソートして最高スコアを返す
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0]?.score > 0 ? scored[0].file : files[0];
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
    console.log('[GyomuDriveFolderService] Cache cleared');
  }
}
