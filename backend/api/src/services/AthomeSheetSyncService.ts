// Athomeシートからコメントデータを同期するサービス
import { google } from 'googleapis';
import { PropertyDetailsService } from './PropertyDetailsService';
import { GyomuListService } from './GyomuListService';

/**
 * 物件種別に応じたセル位置マッピング
 * 
 * 参照: ATHOME_SHEET_CELL_MAPPING.md
 */
const CELL_MAPPING = {
  land: {
    favoriteComment: 'B53',
    recommendedComments: 'B63:L79',
  },
  detached_house: {
    favoriteComment: 'B142',
    recommendedComments: 'B152:L166',
  },
  apartment: {
    favoriteComment: 'B150',
    recommendedComments: 'B149:L163',
  },
};

export interface AthomeCommentData {
  favoriteComment: string | null;
  recommendedComments: string[];
  panoramaUrl: string | null;
}

export class AthomeSheetSyncService {
  private sheets: any;
  private propertyDetailsService: PropertyDetailsService;
  private gyomuListService: GyomuListService;

  constructor() {
    // Vercel環境では環境変数から、ローカル環境ではファイルから認証情報を取得
    let credentials;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      // Vercel環境：環境変数から取得
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      // ローカル環境：ファイルから取得
      const fs = require('fs');
      const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
      credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    this.sheets = google.sheets({ version: 'v4', auth });
    this.propertyDetailsService = new PropertyDetailsService();
    this.gyomuListService = new GyomuListService();
  }

  /**
   * 業務リストから個別物件スプレッドシートのIDを取得
   * GyomuListServiceを使用してカラム名で正確に取得する
   */
  private async getIndividualSpreadsheetId(propertyNumber: string): Promise<string | null> {
    try {
      const gyomuData = await this.gyomuListService.getByPropertyNumber(propertyNumber);
      
      if (!gyomuData || !gyomuData.spreadsheetUrl) {
        console.log(`[AthomeSheetSyncService] Spreadsheet URL not found for ${propertyNumber}`);
        return null;
      }

      // URLからスプレッドシートIDを抽出
      const match = gyomuData.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        console.log(`[AthomeSheetSyncService] Found spreadsheet ID for ${propertyNumber}: ${match[1]}`);
        return match[1];
      }

      console.log(`[AthomeSheetSyncService] Could not extract spreadsheet ID from URL for ${propertyNumber}: ${gyomuData.spreadsheetUrl}`);
      return null;
    } catch (error: any) {
      console.error(`[AthomeSheetSyncService] Error getting spreadsheet ID for ${propertyNumber}:`, error.message);
      return null;
    }
  }

  /**
   * スプレッドシートから実際のathomeシート名を取得
   * スペースの有無・大文字小文字を無視してマッチング
   */
  private async getActualSheetName(spreadsheetId: string): Promise<string> {
    try {
      const metadata = await this.sheets.spreadsheets.get({ spreadsheetId });
      const sheets = metadata.data.sheets || [];
      const sheetNames: string[] = sheets.map((s: any) => s.properties?.title || '');
      
      console.log(`[AthomeSheetSyncService] Available sheets: ${sheetNames.join(', ')}`);
      
      // 'athome'（大文字小文字・前後スペース無視）にマッチするシート名を探す
      const matched = sheetNames.find(name => name.trim().toLowerCase() === 'athome');
      
      if (matched) {
        console.log(`[AthomeSheetSyncService] Found sheet name: "${matched}"`);
        return matched;
      }
      
      // マッチしない場合はエラーをthrow
      console.error(`[AthomeSheetSyncService] Sheet 'athome' not found. Available: ${sheetNames.join(', ')}`);
      throw new Error(`Sheet 'athome' not found in spreadsheet ${spreadsheetId}. Available sheets: ${sheetNames.join(', ')}`);
    } catch (error: any) {
      if (error.message.includes('Sheet \'athome\' not found')) {
        throw error;
      }
      console.error(`[AthomeSheetSyncService] Error getting sheet names:`, error.message);
      // メタデータ取得に失敗した場合はデフォルト値を使用
      return 'athome';
    }
  }

  /**
   * Athomeシートからコメントデータを取得
   */
  async fetchCommentsFromAthomeSheet(
    spreadsheetId: string,
    propertyType: 'land' | 'detached_house' | 'apartment'
  ): Promise<AthomeCommentData> {
    // 実際のシート名を動的に取得（スペースの有無に対応）
    const sheetName = await this.getActualSheetName(spreadsheetId);
    const cellPositions = CELL_MAPPING[propertyType];

    if (!cellPositions) {
      console.error(`[AthomeSheetSyncService] Invalid property type: ${propertyType}`);
      return {
        favoriteComment: null,
        recommendedComments: [],
        panoramaUrl: null,
      };
    }

    try {
      // お気に入り文言を取得
      const favoriteResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${cellPositions.favoriteComment}`,
      });
      const favoriteComment = favoriteResponse.data.values?.[0]?.[0] || null;

      // アピールポイントを取得
      const recommendedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${cellPositions.recommendedComments}`,
      });
      const recommendedRows = recommendedResponse.data.values || [];
      const recommendedComments: string[] = [];
      
      recommendedRows.forEach(row => {
        const text = row.join(' ').trim();
        if (text) {
          recommendedComments.push(text);
        }
      });

      // パノラマURLを取得（athomeシートのN1セル）
      const panoramaResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!N1`,
      });
      const panoramaUrl = panoramaResponse.data.values?.[0]?.[0] || null;

      console.log(`[AthomeSheetSyncService] Fetched comments from ${spreadsheetId}:`, {
        has_favorite_comment: !!favoriteComment,
        recommended_comments_count: recommendedComments.length,
        has_panorama_url: !!panoramaUrl,
      });

      return {
        favoriteComment,
        recommendedComments,
        panoramaUrl,
      };
    } catch (error: any) {
      console.error(`[AthomeSheetSyncService] Error fetching comments from ${spreadsheetId}:`, error.message);
      throw error;
    }
  }

  /**
   * 物件のコメントデータを同期（リトライ機能付き）
   * 
   * @param propertyNumber - 物件番号
   * @param propertyType - 物件種別
   * @param maxRetries - 最大リトライ回数（デフォルト: 3）
   * @param retryDelay - リトライ間隔（ミリ秒、デフォルト: 1000）
   * @returns 同期成功の場合true
   */
  async syncPropertyComments(
    propertyNumber: string,
    propertyType: 'land' | 'detached_house' | 'apartment',
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<boolean> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AthomeSheetSyncService] Syncing comments for ${propertyNumber} (${propertyType}) - Attempt ${attempt}/${maxRetries}`);

        // 個別物件スプレッドシートのIDを取得
        const spreadsheetId = await this.getIndividualSpreadsheetId(propertyNumber);
        if (!spreadsheetId) {
          const errMsg = `Spreadsheet ID not found for ${propertyNumber} - check GYOMU_LIST_SPREADSHEET_ID env var and that the property exists in 業務依頼 sheet`;
          console.error(`[AthomeSheetSyncService] ${errMsg}`);
          throw new Error(errMsg);
        }

        // Athomeシートからコメントデータを取得
        const comments = await this.fetchCommentsFromAthomeSheet(spreadsheetId, propertyType);

        // athome_dataを構築（パノラマURLを含む）
        const athomeData = comments.panoramaUrl ? [comments.panoramaUrl] : [];

        // データベースに保存（property_aboutは含めない - 物件シートから取得するため）
        const success = await this.propertyDetailsService.upsertPropertyDetails(propertyNumber, {
          favorite_comment: comments.favoriteComment,
          recommended_comments: comments.recommendedComments,
          athome_data: athomeData,
        });

        if (success) {
          console.log(`[AthomeSheetSyncService] ✅ Successfully synced comments for ${propertyNumber} (attempt ${attempt})`);
          return true;
        } else {
          throw new Error('Failed to save to database');
        }
      } catch (error: any) {
        lastError = error;
        console.error(`[AthomeSheetSyncService] ❌ Attempt ${attempt}/${maxRetries} failed for ${propertyNumber}:`, error.message);
        
        // 最後の試行でない場合は待機してリトライ
        if (attempt < maxRetries) {
          console.log(`[AthomeSheetSyncService] Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // 全てのリトライが失敗
    console.error(`[AthomeSheetSyncService] ❌ All ${maxRetries} attempts failed for ${propertyNumber}`);
    console.error(`[AthomeSheetSyncService] Last error:`, lastError?.message);
    return false;
  }
}
