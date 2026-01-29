// Athomeシートからコメントデータを同期するサービス
import { google } from 'googleapis';
import { PropertyDetailsService } from './PropertyDetailsService';

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
  }

  /**
   * 業務リストから個別物件スプレッドシートのIDを取得
   */
  private async getIndividualSpreadsheetId(propertyNumber: string): Promise<string | null> {
    try {
      const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
      if (!gyomuListSpreadsheetId) {
        console.error('[AthomeSheetSyncService] GYOMU_LIST_SPREADSHEET_ID not found in environment');
        return null;
      }

      // 業務リストの「業務依頼」シートから物件番号で検索
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: gyomuListSpreadsheetId,
        range: '業務依頼!A:D', // A列（物件番号）からD列（スプシURL）まで
      });

      const rows = response.data.values || [];
      
      // 物件番号で検索（A列）
      for (const row of rows) {
        if (row[0] === propertyNumber) {
          const spreadsheetUrl = row[3]; // D列（スプシURL）
          if (spreadsheetUrl) {
            // URLからスプレッドシートIDを抽出
            const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match) {
              console.log(`[AthomeSheetSyncService] Found spreadsheet ID for ${propertyNumber}: ${match[1]}`);
              return match[1];
            }
          }
        }
      }

      console.log(`[AthomeSheetSyncService] Spreadsheet URL not found for ${propertyNumber}`);
      return null;
    } catch (error: any) {
      console.error(`[AthomeSheetSyncService] Error getting spreadsheet ID for ${propertyNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Athomeシートからコメントデータを取得
   */
  async fetchCommentsFromAthomeSheet(
    spreadsheetId: string,
    propertyType: 'land' | 'detached_house' | 'apartment'
  ): Promise<AthomeCommentData> {
    const sheetName = 'athome';
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
      return {
        favoriteComment: null,
        recommendedComments: [],
        panoramaUrl: null,
      };
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
          console.error(`[AthomeSheetSyncService] Spreadsheet ID not found for ${propertyNumber}`);
          
          // スプレッドシートIDが見つからない場合はリトライしない
          return false;
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
