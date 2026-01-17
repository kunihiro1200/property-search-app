import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { GoogleSheetsClient, SheetRow } from './GoogleSheetsClient';
import { normalizePhoneNumber, determineInquirySource, generateBuyerNumber, PropertyData } from '../utils/inquiryHelpers';

/**
 * 問い合わせ同期サービスの設定
 */
export interface InquirySyncConfig {
  spreadsheetId: string;
  sheetName: string;
  serviceAccountKeyPath: string;
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * 問い合わせデータ
 */
export interface InquiryData {
  id: string;
  property_id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
  sheet_sync_status?: string;
  sync_retry_count?: number;
}

/**
 * 同期結果
 */
export interface SyncResult {
  success: boolean;
  rowNumber?: number;
  error?: string;
}

/**
 * 問い合わせ同期サービス
 * 
 * 公開物件サイトの問い合わせデータをGoogleスプレッドシート「買主リスト」に転記します。
 */
export class InquirySyncService {
  private sheetsClient: GoogleSheetsClient;
  private supabase: SupabaseClient;
  private pgPool: Pool;
  private config: InquirySyncConfig;

  constructor(config: InquirySyncConfig) {
    this.config = config;
    
    // GoogleSheetsClientを初期化
    this.sheetsClient = new GoogleSheetsClient({
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      serviceAccountKeyPath: config.serviceAccountKeyPath,
    });
    
    // Supabaseクライアントを初期化（property_listingsテーブル用）
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // PostgreSQLプールを初期化（property_inquiriesテーブル用 - PostgRESTをバイパス）
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * GoogleSheetsClientを認証する
   */
  async authenticate(): Promise<void> {
    await this.sheetsClient.authenticate();
  }

  /**
   * 問い合わせをスプレッドシートに転記する（再試行付き）
   * 
   * @param inquiryId - 問い合わせID
   * @param attempt - 試行回数（デフォルト: 1）
   * @returns 同期結果
   */
  async syncInquiry(inquiryId: string, attempt: number = 1): Promise<SyncResult> {
    try {
      console.log(`[InquirySyncService] 問い合わせ ${inquiryId} の転記を開始（試行 ${attempt}/${this.config.maxRetries}）`);

      // 1. 問い合わせデータをDBから取得（直接PostgreSQL接続を使用）
      const inquiryResult = await this.pgPool.query(
        'SELECT * FROM property_inquiries WHERE id = $1',
        [inquiryId]
      );

      if (inquiryResult.rows.length === 0) {
        console.error(`[InquirySyncService] 問い合わせが見つかりません: ${inquiryId}`);
        throw new Error(`問い合わせが見つかりません: ${inquiryId}`);
      }

      const inquiry = inquiryResult.rows[0];

      // 重複転記防止: 既に同期済みの場合はスキップ
      if (inquiry.sheet_sync_status === 'synced') {
        console.log(`[InquirySyncService] 問い合わせ ${inquiryId} は既に同期済みです`);
        return { success: true, rowNumber: inquiry.sheet_row_number };
      }

      // 2. 物件データを取得（Supabase Clientを使用 - property_listingsはスキーマキャッシュに存在する）
      const { data: property, error: propertyError } = await this.supabase
        .from('property_listings')
        .select('property_number, site_display, athome_public_folder_id')
        .eq('id', inquiry.property_id)
        .single();

      if (propertyError || !property) {
        throw new Error(`物件が見つかりません: ${inquiry.property_id}`);
      }

      // 3. 買主番号を採番
      const buyerNumber = await this.generateBuyerNumberFromSheet();

      // 4. フィールドマッピング
      const normalizedPhone = normalizePhoneNumber(inquiry.phone);
      const inquirySource = determineInquirySource(property as PropertyData);

      const rowData: SheetRow = {
        '買主番号': buyerNumber.toString(),
        '氏名・会社名': inquiry.name,
        '問合時ヒアリング': inquiry.message,
        '電話番号': normalizedPhone,
        'メールアドレス': inquiry.email,
        '問合せ元': inquirySource,
        '物件番号': property.property_number,
      };

      // 5. スプレッドシートに行を追加
      await this.sheetsClient.appendRow(rowData);

      // 6. 行番号を取得（追加後の最終行）
      const allRows = await this.sheetsClient.readAll();
      const rowNumber = allRows.length + 1; // ヘッダー行を含む

      // 7. ステータスを'synced'に更新（直接PostgreSQL接続を使用）
      await this.pgPool.query(
        `UPDATE property_inquiries 
         SET sheet_sync_status = $1, 
             sheet_row_number = $2, 
             sheet_synced_at = $3, 
             sync_retry_count = $4 
         WHERE id = $5`,
        ['synced', rowNumber, new Date().toISOString(), 0, inquiryId]
      );

      console.log(`[InquirySyncService] 問い合わせ ${inquiryId} の転記が完了しました（行番号: ${rowNumber}）`);

      return { success: true, rowNumber };

    } catch (error: any) {
      console.error(`[InquirySyncService] 転記エラー（試行 ${attempt}/${this.config.maxRetries}）:`, error);
      
      // 最大再試行回数に達していない場合は再試行
      if (attempt < this.config.maxRetries) {
        // エラーの種類に応じて待機時間を調整
        let delay = this.config.retryDelayMs * Math.pow(2, attempt - 1); // 指数バックオフ

        // レート制限エラーの場合、Retry-Afterヘッダーに従う
        if (error.status === 429 && error.headers && error.headers['retry-after']) {
          delay = parseInt(error.headers['retry-after']) * 1000;
          console.log(`[InquirySyncService] レート制限エラー、${delay}ms後に再試行します`);
        } else {
          console.log(`[InquirySyncService] ${delay}ms後に再試行します`);
        }

        // 再試行回数を更新（直接PostgreSQL接続を使用）
        await this.pgPool.query(
          'UPDATE property_inquiries SET sync_retry_count = $1 WHERE id = $2',
          [attempt, inquiryId]
        );

        // 待機
        await this.sleep(delay);

        // 再試行
        return this.syncInquiry(inquiryId, attempt + 1);
      }
      
      // 最大再試行回数に達した場合、エラー情報をDBに記録（直接PostgreSQL接続を使用）
      await this.pgPool.query(
        `UPDATE property_inquiries 
         SET sheet_sync_status = $1, 
             sheet_sync_error_message = $2, 
             sync_retry_count = $3 
         WHERE id = $4`,
        ['failed', error.message || String(error), attempt, inquiryId]
      );

      // TODO: 管理者に通知
      console.log(`[InquirySyncService] 管理者への通知が必要です: ${inquiryId}`);

      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * 未同期の問い合わせを一括処理する
   */
  async syncPendingInquiries(): Promise<void> {
    try {
      console.log('[InquirySyncService] 未同期の問い合わせを検索中...');

      // 未同期の問い合わせを取得（直接PostgreSQL接続を使用）
      const result = await this.pgPool.query(
        `SELECT id FROM property_inquiries 
         WHERE sheet_sync_status = $1 
         ORDER BY created_at ASC`,
        ['pending']
      );

      const pendingInquiries = result.rows;

      if (!pendingInquiries || pendingInquiries.length === 0) {
        console.log('[InquirySyncService] 未同期の問い合わせはありません');
        return;
      }

      console.log(`[InquirySyncService] ${pendingInquiries.length}件の未同期問い合わせを処理します`);

      // 各問い合わせを順次処理
      for (const inquiry of pendingInquiries) {
        await this.syncInquiry(inquiry.id);
      }

      console.log('[InquirySyncService] 未同期問い合わせの処理が完了しました');

    } catch (error) {
      console.error('[InquirySyncService] 未同期問い合わせの処理中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 買主番号を自動採番する（プライベートメソッド）
   */
  private async generateBuyerNumberFromSheet(): Promise<number> {
    try {
      // E列のすべての値を取得
      const allRows = await this.sheetsClient.readAll();
      
      // E列（買主番号）の値を抽出
      const columnEValues = allRows
        .map(row => row['買主番号'])
        .filter(value => value !== null && value !== undefined)
        .map(value => String(value));
      
      // ヘルパー関数を使用して採番
      return generateBuyerNumber(columnEValues);
      
    } catch (error: any) {
      console.error(`[InquirySyncService] 買主番号採番エラー:`, error);
      // エラーが発生した場合は、デフォルト値として1を返す
      console.log(`[InquirySyncService] デフォルト値1を使用します`);
      return 1;
    }
  }

  /**
   * 指定時間待機する（プライベートメソッド）
   * 
   * @param ms - 待機時間（ミリ秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
