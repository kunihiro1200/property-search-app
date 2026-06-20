import { GoogleSheetsClient } from './GoogleSheetsClient';
import { PropertyListingService } from './PropertyListingService';
import { getRedisClient } from '../config/redis';

export interface FavoriteCommentResult {
  comment: string | null;
  propertyType: string;
}

/**
 * お気に入り文言取得サービス
 * 
 * 物件公開サイトの画像上に表示する「お気に入り文言」を
 * 業務リストスプレッドシートの「athome」シート（または「athome 」シート）から取得します。
 * 
 * 物件種別に応じて以下のセルから文言を取得:
 * - 土地: B53
 * - 戸建て: B142
 * - マンション: B150
 */
export class FavoriteCommentService {
  private propertyListingService: PropertyListingService;
  private cachePrefix = 'favorite-comment:';
  private cacheTTL = 300; // 5分間（秒）

  constructor() {
    this.propertyListingService = new PropertyListingService();
  }

  /**
   * 物件IDからお気に入り文言を取得
   * 
   * @param propertyId 物件ID（UUID）
   * @returns お気に入り文言と物件タイプ
   */
  async getFavoriteComment(propertyId: string): Promise<FavoriteCommentResult> {
    try {
      // キャッシュチェック
      const cached = await this.getCachedComment(propertyId);
      if (cached !== null) {
        console.log(`[FavoriteCommentService] Cache hit for property ${propertyId}`);
        return cached;
      }

      // 物件情報を取得
      const property = await this.propertyListingService.getPublicPropertyById(propertyId);

      if (!property) {
        console.warn(`[FavoriteCommentService] Property not found: ${propertyId}`);
        return { comment: null, propertyType: 'unknown' };
      }

      const { property_type, property_number, storage_location } = property;

      // 物件タイプに応じたセル位置を決定
      const cellPosition = this.getCellPosition(property_type);

      if (!cellPosition) {
        console.log(
          `[FavoriteCommentService] Unsupported property type: ${property_type} for ${propertyId}`
        );
        const result = { comment: null, propertyType: property_type };
        await this.cacheComment(propertyId, result);
        return result;
      }

      // 業務リストから個別物件スプレッドシートURLを取得
      const gyomuListService = new (await import('./GyomuListService')).GyomuListService();
      const gyomuData = await gyomuListService.getByPropertyNumber(property_number);
      let spreadsheetUrl = gyomuData?.spreadsheetUrl || null;

      // 業務リストにない場合、Driveフォルダから検索
      if (!spreadsheetUrl) {
        console.log(
          `[FavoriteCommentService] Not found in 業務リスト, searching Drive folder for ${property_number}`
        );
        const gyomuDriveService = new (await import('./GyomuDriveFolderService')).GyomuDriveFolderService();
        spreadsheetUrl = await gyomuDriveService.findSpreadsheetByPropertyNumber(property_number);
        
        if (spreadsheetUrl) {
          console.log(
            `[FavoriteCommentService] Found spreadsheet in Drive folder: ${spreadsheetUrl}`
          );
        }
      }

      // スプレッドシートURLがない場合
      if (!spreadsheetUrl) {
        console.log(
          `[FavoriteCommentService] No spreadsheet URL for property ${propertyId} (not in 業務リスト or Drive folder)`
        );
        const result = { comment: null, propertyType: property_type };
        await this.cacheComment(propertyId, result);
        return result;
      }

      // スプレッドシートから文言を取得
      const comment = await this.fetchCommentFromSpreadsheet(
        spreadsheetUrl,
        cellPosition
      );

      const result = { comment, propertyType: property_type };

      // 結果をキャッシュ
      await this.cacheComment(propertyId, result);

      return result;
    } catch (error: any) {
      console.error(
        `[FavoriteCommentService] Error getting favorite comment for ${propertyId}:`,
        error.message
      );
      // エラー時もグレースフルデグラデーション
      return { comment: null, propertyType: 'unknown' };
    }
  }

  /**
   * 物件タイプからセル位置を取得
   * 
   * @param propertyType 物件タイプ
   * @returns セル位置（例: B53）またはnull
   */
  private getCellPosition(propertyType: string): string | null {
    // 物件タイプとセル位置のマッピング（日本語と英語の両方に対応）
    const cellMap: Record<string, string> = {
      // 日本語
      '土地': 'B53',
      '戸建て': 'B142',
      '戸建': 'B142',
      'マンション': 'B150',
      // 英語（データベースに保存されている形式）
      'land': 'B53',
      'detached_house': 'B142',
      'apartment': 'B150',
    };

    return cellMap[propertyType] || null;
  }

  /**
   * スプレッドシートから文言を取得
   * 
   * @param spreadsheetUrl スプレッドシートURL
   * @param cellPosition セル位置（例: B53）
   * @returns 文言またはnull
   */
  private async fetchCommentFromSpreadsheet(
    spreadsheetUrl: string,
    cellPosition: string
  ): Promise<string | null> {
    try {
      // スプレッドシートURLからIDを抽出
      const spreadsheetId = this.extractSpreadsheetId(spreadsheetUrl);

      if (!spreadsheetId) {
        console.warn(
          `[FavoriteCommentService] Invalid spreadsheet URL: ${spreadsheetUrl}`
        );
        return null;
      }

      // GoogleSheetsClientを初期化
      const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
      const googleSheetsClient = new GoogleSheetsClient({
        spreadsheetId,
        sheetName: 'athome',
        serviceAccountKeyPath,
      });

      // 認証
      await googleSheetsClient.authenticate();
      const sheets = (googleSheetsClient as any).sheets;

      // 指定セルの値を取得
      // シート名は'athome'または'athome 'の可能性があるため、両方試す
      let values = null;
      let lastError = null;
      
      // 試行する範囲フォーマットのリスト
      const rangeFormats = [
        `athome!${cellPosition}`,        // スペースなし（引用符なし）
        `'athome '!${cellPosition}`,     // 末尾にスペース（引用符あり）
      ];
      
      for (const range of rangeFormats) {
        try {
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
          });
          values = response.data.values;
          // 成功したらループを抜ける
          break;
        } catch (error: any) {
          lastError = error;
          // 次の形式を試す
          continue;
        }
      }
      
      // すべての形式で失敗した場合
      if (!values && lastError) {
        console.error(
          `[FavoriteCommentService] Failed to fetch comment from ${spreadsheetUrl} at ${cellPosition}:`,
          lastError.message
        );
        return null;
      }

      if (values && values.length > 0 && values[0].length > 0) {
        const comment = String(values[0][0]).trim();
        return comment || null;
      }

      return null;
    } catch (error: any) {
      console.error(
        `[FavoriteCommentService] Failed to fetch comment from ${spreadsheetUrl} at ${cellPosition}:`,
        error.message
      );
      // エラー時もnullを返す（グレースフルデグラデーション）
      return null;
    }
  }

  /**
   * スプレッドシートURLからIDを抽出
   * 
   * @param url スプレッドシートURL
   * @returns スプレッドシートIDまたはnull
   */
  private extractSpreadsheetId(url: string): string | null {
    try {
      // Google SheetsのURL形式: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * キャッシュから文言を取得
   * 
   * @param propertyId 物件ID
   * @returns キャッシュされた結果またはnull
   */
  private async getCachedComment(
    propertyId: string
  ): Promise<FavoriteCommentResult | null> {
    try {
      const redisClient = getRedisClient();
      const cacheKey = `${this.cachePrefix}${propertyId}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as FavoriteCommentResult;
      }

      return null;
    } catch (error: any) {
      console.error(
        `[FavoriteCommentService] Cache read error for ${propertyId}:`,
        error.message
      );
      // キャッシュエラーは無視
      return null;
    }
  }

  /**
   * 文言をキャッシュに保存
   * 
   * @param propertyId 物件ID
   * @param result 文言結果
   */
  private async cacheComment(
    propertyId: string,
    result: FavoriteCommentResult
  ): Promise<void> {
    try {
      const redisClient = getRedisClient();
      const cacheKey = `${this.cachePrefix}${propertyId}`;
      await redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(result));
    } catch (error: any) {
      console.error(
        `[FavoriteCommentService] Cache write error for ${propertyId}:`,
        error.message
      );
      // キャッシュエラーは無視
    }
  }
}
