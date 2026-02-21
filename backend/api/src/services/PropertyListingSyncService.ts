/**
 * 物件リスト同期サービス
 * 
 * 物件スプシ（物件リストスプレッドシート）からproperty_listingsテーブルへの自動同期を管理します。
 * 
 * 同期フロー:
 * 1. 物件スプシ（物件リストスプレッドシート）から物件データを取得 ← メインソース
 * 2. property_listingsテーブルに同期
 * 3. 業務依頼シートから「スプシURL」を取得して補完 ← 補助情報
 * 
 * 同期トリガー:
 * - Vercel Cron Job（15分ごと）
 * - 手動実行
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './GoogleSheetsClient.js';
import { PropertyImageService } from './PropertyImageService.js';
import { GoogleDriveService } from './GoogleDriveService.js';

export interface PropertyListingSyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  totalProcessed: number;
  successfullyAdded: number;
  successfullyUpdated: number;
  failed: number;
  errors: Array<{ propertyNumber: string; message: string }>;
  triggeredBy: 'scheduled' | 'manual';
}

export class PropertyListingSyncService {
  private supabase: SupabaseClient;
  private propertyListSheetsClient: GoogleSheetsClient | null = null;
  private gyomuListSheetsClient: GoogleSheetsClient | null = null;
  private propertyImageService: PropertyImageService;
  private isInitialized = false;
  private gyomuListCache: Array<Record<string, any>> | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    // GoogleDriveServiceをインスタンス化して、PropertyImageServiceに渡す
    const driveService = new GoogleDriveService();
    this.propertyImageService = new PropertyImageService(
      driveService,
      60, // cacheTTLMinutes
      parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10),
      parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10),
      parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10)
    );
  }

  /**
   * Google Sheets クライアントを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. 物件リストスプレッドシート（メインソース）
      const propertyListConfig: any = {
        spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
        sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      };
      
      // ローカル環境の場合、serviceAccountKeyPathを渡す
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        propertyListConfig.serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
      }
      
      this.propertyListSheetsClient = new GoogleSheetsClient(propertyListConfig);
      await this.propertyListSheetsClient.authenticate();
      console.log('✅ Property list spreadsheet client initialized');

      // 2. 業務依頼シート（補助情報：スプシURL取得用）
      const gyomuListConfig: any = {
        spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
        sheetName: process.env.GYOMU_LIST_SHEET_NAME || '業務依頼',
      };
      
      // ローカル環境の場合、serviceAccountKeyPathを渡す
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        gyomuListConfig.serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
      }
      
      this.gyomuListSheetsClient = new GoogleSheetsClient(gyomuListConfig);
      await this.gyomuListSheetsClient.authenticate();
      console.log('✅ Gyomu list spreadsheet client initialized');

      this.isInitialized = true;
      console.log('✅ PropertyListingSyncService initialized');
    } catch (error: any) {
      console.error('❌ PropertyListingSyncService initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * 業務依頼シートのデータを一度だけ取得してキャッシュ
   */
  private async loadGyomuListCache(): Promise<void> {
    if (this.gyomuListCache !== null) {
      console.log('  📦 Using cached gyomu list data');
      return;
    }

    if (!this.gyomuListSheetsClient) {
      return;
    }

    try {
      console.log('  🔄 Loading gyomu list data...');
      this.gyomuListCache = await this.gyomuListSheetsClient.readAll();
      console.log(`  ✅ Gyomu list data loaded (${this.gyomuListCache.length} rows)`);
    } catch (error: any) {
      console.error(`  ❌ Error loading gyomu list data:`, error.message);
      this.gyomuListCache = [];
    }
  }

  /**
   * 業務依頼シートからスプシURLを取得（キャッシュ使用）
   */
  private async getSpreadsheetUrlFromGyomuList(propertyNumber: string): Promise<string | null> {
    await this.loadGyomuListCache();
    
    if (!this.gyomuListCache) {
      return null;
    }

    try {
      for (const row of this.gyomuListCache) {
        if (row['物件番号'] === propertyNumber) {
          const url = row['スプシURL'];
          return url ? String(url) : null;
        }
      }
      
      return null;
    } catch (error: any) {
      console.error(`  ⚠️ Error fetching spreadsheet URL for ${propertyNumber}:`, error.message);
      return null;
    }
  }

  /**
   * 業務依頼シートから格納先URL（CO列）を取得（キャッシュ使用）
   */
  private async getStorageLocationFromGyomuList(propertyNumber: string): Promise<string | null> {
    await this.loadGyomuListCache();
    
    if (!this.gyomuListCache) {
      return null;
    }

    try {
      for (const row of this.gyomuListCache) {
        if (row['物件番号'] === propertyNumber) {
          const storageUrl = row['格納先URL'];
          return storageUrl ? String(storageUrl) : null;
        }
      }
      
      return null;
    } catch (error: any) {
      console.error(`  ⚠️ Error fetching storage location for ${propertyNumber}:`, error.message);
      return null;
    }
  }

  /**
   * フル同期を実行（バッチ処理版）
   * 物件リストスプレッドシートからproperty_listingsテーブルを同期
   * 
   * @param batchSize バッチサイズ（デフォルト: 100件）
   * @param startIndex 開始インデックス（デフォルト: 0）
   */
  async runFullSync(
    triggeredBy: 'scheduled' | 'manual' = 'scheduled',
    batchSize: number = 100,
    startIndex: number = 0
  ): Promise<PropertyListingSyncResult> {
    const startTime = new Date();
    console.log(`🔄 Starting property listings sync (triggered by: ${triggeredBy}, batch: ${startIndex}-${startIndex + batchSize})`);

    if (!this.propertyListSheetsClient) {
      throw new Error('PropertyListingSyncService not initialized');
    }

    const result: PropertyListingSyncResult = {
      success: false,
      startTime,
      endTime: new Date(),
      totalProcessed: 0,
      successfullyAdded: 0,
      successfullyUpdated: 0,
      failed: 0,
      errors: [],
      triggeredBy,
    };

    try {
      // 1. 物件リストスプレッドシートから全行を取得
      console.log('📋 Fetching all rows from property list spreadsheet...');
      
      // まず全体の行数を取得（ヘッダー行を含む）
      const allRows = await this.propertyListSheetsClient.readAll();
      const totalRows = allRows.length;
      
      if (totalRows === 0) {
        console.log('⚠️ No data found in property list spreadsheet');
        result.success = true;
        result.endTime = new Date();
        return result;
      }
      
      // 空行を除外
      const nonEmptyRows = allRows.filter(row => {
        const propertyNumber = row['物件番号'];
        return propertyNumber && String(propertyNumber).trim() !== '';
      });
      
      console.log(`📊 Total non-empty rows: ${nonEmptyRows.length} (out of ${totalRows} total rows)`);
      
      // バッチ処理：指定された範囲のみ処理
      const endIndex = Math.min(startIndex + batchSize, nonEmptyRows.length);
      const rows = nonEmptyRows.slice(startIndex, endIndex);
      
      if (rows.length === 0) {
        console.log('⚠️ No rows to process in this batch');
        result.success = true;
        result.endTime = new Date();
        return result;
      }

      console.log(`📊 Processing batch ${startIndex}-${endIndex} (${rows.length} rows)`);

      // 2. 業務依頼シートを1回だけ読み取り（サイドバーステータス計算用）
      console.log('📋 Fetching gyomu list data for sidebar status calculation...');
      let gyomuListData: any[] = [];
      try {
        gyomuListData = await this.gyomuListSheetsClient!.readAll();
        console.log(`✅ Fetched ${gyomuListData.length} rows from gyomu list`);
      } catch (error: any) {
        console.error('⚠️ Failed to fetch gyomu list data:', error.message);
        console.log('⚠️ Continuing without gyomu list data (sidebar status may be incomplete)');
      }

      // 2. 各行を処理
      for (const row of rows) {
        result.totalProcessed++;

        try {
          const propertyNumber = String(row['物件番号'] || '');
          
          if (!propertyNumber) {
            console.log(`⚠️ Skipping row without property number`);
            continue;
          }

          // atbb_statusを確認（文字列に変換）
          // 正しいカラム名: 「atbb成約済み/非公開」
          const atbbStatus = String(row['atbb成約済み/非公開'] || row['atbb_status'] || row['ATBB_status'] || row['ステータス'] || '');
          
          // 基本的に全ての物件を同期（atbb_statusでフィルタリングしない）
          // 公開物件サイトでの表示フィルタリングは別途行う
          console.log(`📝 Processing ${propertyNumber} (atbb_status: ${atbbStatus})...`);

          // 3. 既存の物件を確認
          const { data: existing, error: fetchError } = await this.supabase
            .from('property_listings')
            .select('id, property_number, atbb_status, storage_location, spreadsheet_url')
            .eq('property_number', propertyNumber)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
          }

          // 4. storage_locationを取得
          // 優先順位: 1. 既存のDB値（URL形式のみ） 2. 業務依頼シートのCO列「格納先URL」 3. Google Drive検索
          let storageLocation = existing?.storage_location || null;
          
          // 既存のDB値がURL形式でない場合は無効とみなす
          // URL形式: https://drive.google.com/drive/folders/... または https://drive.google.com/drive/u/0/folders/...
          if (storageLocation && !String(storageLocation).startsWith('https://drive.google.com/drive/')) {
            console.log(`  ⚠️ Existing storage_location is not a valid URL format: ${storageLocation}`);
            storageLocation = null; // 無効な値なので再取得
          }

          if (!storageLocation) {
            // まず業務依頼シートのCO列「格納先URL」から取得
            console.log(`  🔍 Fetching storage location from gyomu list...`);
            const gyomuStorageLocation = await this.getStorageLocationFromGyomuList(propertyNumber);
            
            // URL形式かチェック（https://drive.google.com/drive/で始まる）
            // /u/0/が含まれる形式も許可: https://drive.google.com/drive/u/0/folders/...
            if (gyomuStorageLocation && 
                String(gyomuStorageLocation).trim() !== '' &&
                String(gyomuStorageLocation).startsWith('https://drive.google.com/drive/')) {
              storageLocation = String(gyomuStorageLocation);
              console.log(`  ✅ Found valid storage_location URL in gyomu list: ${storageLocation}`);
            } else {
              if (gyomuStorageLocation) {
                console.log(`  ⚠️ Invalid storage_location format in gyomu list (not a URL): ${gyomuStorageLocation}`);
              }
              
              // 業務依頼シートにURL形式の値がない場合、Google Driveで検索
              console.log(`  🔍 Searching for Google Drive folder...`);
              storageLocation = await this.propertyImageService.getImageFolderUrl(propertyNumber);
              
              if (storageLocation) {
                console.log(`  ✅ Found folder in Google Drive: ${storageLocation}`);
              } else {
                console.log(`  ⚠️ Folder not found in gyomu list or Google Drive`);
              }
            }
          }

          // 5. 業務依頼シートからスプシURLを取得（補助情報）
          let spreadsheetUrl = existing?.spreadsheet_url || null;
          
          if (!spreadsheetUrl) {
            console.log(`  🔍 Fetching spreadsheet URL from gyomu list...`);
            spreadsheetUrl = await this.getSpreadsheetUrlFromGyomuList(propertyNumber);
            
            if (spreadsheetUrl) {
              console.log(`  ✅ Found spreadsheet URL: ${spreadsheetUrl}`);
            } else {
              console.log(`  ⚠️ Spreadsheet URL not found in gyomu list`);
            }
          }

          // 6. 物件データを準備
          const propertyData: any = {
            property_number: propertyNumber,
            address: String(row['所在地'] || ''),
            display_address: String(row['住居表示（ATBB登録住所）'] || ''),
            property_type: String(row['種別'] || ''),
            sales_price: row['売買価格'] ? parseFloat(String(row['売買価格']).replace(/,/g, '')) : null,
            buyer_name: String(row['名前（買主）'] || ''),
            seller_name: String(row['名前(売主）'] || ''),
            land_area: row['土地面積'] ? parseFloat(String(row['土地面積'])) : null,
            building_area: row['建物面積'] ? parseFloat(String(row['建物面積'])) : null,
            listing_price: row['売出価格'] ? parseFloat(String(row['売出価格']).replace(/,/g, '')) : null,
            atbb_status: atbbStatus,
            status: String(row['状況'] || ''),
            storage_location: storageLocation,
            spreadsheet_url: spreadsheetUrl,
            google_map_url: String(row['GoogleMap'] || ''),
            current_status: String(row['●現況'] || ''),
            delivery: String(row['引渡し'] || ''),
            sidebar_status: this.calculateSidebarStatus(row, gyomuListData),
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            // 更新
            const { error: updateError } = await this.supabase
              .from('property_listings')
              .update(propertyData)
              .eq('id', existing.id);

            if (updateError) {
              throw updateError;
            }

            console.log(`  ✅ Updated ${propertyNumber}`);
            result.successfullyUpdated++;
          } else {
            // 新規追加
            const { error: insertError } = await this.supabase
              .from('property_listings')
              .insert({
                ...propertyData,
                created_at: new Date().toISOString(),
              });

            if (insertError) {
              throw insertError;
            }

            console.log(`  ✅ Added ${propertyNumber}`);
            result.successfullyAdded++;
          }

        } catch (error: any) {
          console.error(`  ❌ Error processing row:`, error.message);
          result.failed++;
          result.errors.push({
            propertyNumber: String(row['物件番号'] || 'unknown'),
            message: error.message,
          });
        }
      }

      result.success = result.failed === 0;
      result.endTime = new Date();

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 Property Listings Sync Summary (Batch):');
      console.log(`   Batch range: ${startIndex}-${endIndex}`);
      console.log(`   Total processed: ${result.totalProcessed}`);
      console.log(`   ✅ Added: ${result.successfullyAdded}`);
      console.log(`   ✅ Updated: ${result.successfullyUpdated}`);
      console.log(`   ❌ Failed: ${result.failed}`);
      console.log(`   Duration: ${result.endTime.getTime() - result.startTime.getTime()}ms`);
      console.log(`   Remaining: ${Math.max(0, nonEmptyRows.length - endIndex)} rows`);
      console.log('═══════════════════════════════════════════════════════════');

      return result;

    } catch (error: any) {
      console.error('❌ Error in property listings sync:', error);
      result.success = false;
      result.endTime = new Date();
      result.errors.push({
        propertyNumber: 'N/A',
        message: error.message,
      });
      return result;
    }
  }

  /**
   * サイドバーステータスを計算
   * @param row 物件リストスプレッドシートの1行
   * @param gyomuListData 業務依頼シートの全データ
   * @returns ステータス文字列（例: "未報告 山本", "未完了", ""）
   */
  private calculateSidebarStatus(row: any, gyomuListData: any[]): string {
    const propertyNumber = String(row['物件番号'] || '');
    const atbbStatus = String(row['atbb成約済み/非公開'] || '');

    // ① 未報告（最優先）
    const reportDate = row['報告日'];
    if (reportDate && this.isDateBeforeOrToday(reportDate)) {
      const assignee = row['報告担当_override'] || row['報告担当'] || '';
      return assignee ? `未報告 ${assignee}` : '未報告';
    }

    // ② 未完了
    if (row['確認'] === '未') {
      return '未完了';
    }

    // ③ 非公開予定（確認後）
    if (row['一般媒介非公開（仮）'] === '非公開予定') {
      return '非公開予定（確認後）';
    }

    // ④ 一般媒介の掲載確認未
    if (row['１社掲載'] === '未確認') {
      return '一般媒介の掲載確認未';
    }

    // ⑤ 本日公開予定
    if (atbbStatus.includes('公開前')) {
      const scheduledDate = this.lookupGyomuList(propertyNumber, gyomuListData, '公開予定日');
      if (scheduledDate && this.isDateBeforeOrToday(scheduledDate)) {
        return '本日公開予定';
      }
    }

    // ⑥ SUUMO / レインズ登録必要
    if (atbbStatus === '一般・公開中' || atbbStatus === '専任・公開中') {
      const scheduledDate = this.lookupGyomuList(propertyNumber, gyomuListData, '公開予定日');
      const suumoUrl = row['Suumo URL'];
      const suumoRegistration = row['Suumo登録'];

      if (scheduledDate &&
          this.isDateBeforeYesterday(scheduledDate) &&
          !suumoUrl &&
          suumoRegistration !== 'S不要') {
        return atbbStatus === '一般・公開中'
          ? 'SUUMO URL　要登録'
          : 'レインズ登録＋SUUMO登録';
      }
    }

    // ⑦ 買付申込み（内覧なし）２
    const kaitsukeStatus = row['買付'];
    if (
      (kaitsukeStatus === '専任片手' && atbbStatus === '専任・公開中') ||
      (kaitsukeStatus === '一般他決' && atbbStatus === '一般・公開中') ||
      (kaitsukeStatus === '専任両手' && atbbStatus === '専任・公開中') ||
      (kaitsukeStatus === '一般両手' && atbbStatus === '一般・公開中') ||
      (kaitsukeStatus === '一般片手' && atbbStatus === '一般・公開中')
    ) {
      return '買付申込み（内覧なし）２';
    }

    // ⑧ 公開前情報
    if (atbbStatus === '一般・公開前' || atbbStatus === '専任・公開前') {
      return '公開前情報';
    }

    // ⑨ 非公開（配信メールのみ）
    if (atbbStatus === '非公開（配信メールのみ）') {
      return '非公開（配信メールのみ）';
    }

    // ⑩ 一般公開中物件
    if (atbbStatus === '一般・公開中') {
      return '一般公開中物件';
    }

    // ⑪ 専任・公開中（担当別）
    if (atbbStatus === '専任・公開中') {
      const assignee = row['担当名（営業）'];
      return this.getAssigneeStatus(assignee);
    }

    // ⑫ それ以外
    return '';
  }

  /**
   * 業務依頼シートからデータを検索（LOOKUP相当）
   */
  private lookupGyomuList(
    propertyNumber: string,
    gyomuListData: any[],
    columnName: string
  ): any {
    const row = gyomuListData.find(r => r['物件番号'] === propertyNumber);
    return row ? row[columnName] : null;
  }

  /**
   * 日付が今日以前かチェック
   */
  private isDateBeforeOrToday(dateValue: any): boolean {
    if (!dateValue) return false;
    const date = this.parseDate(dateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today;
  }

  /**
   * 日付が昨日以前かチェック
   */
  private isDateBeforeYesterday(dateValue: any): boolean {
    if (!dateValue) return false;
    const date = this.parseDate(dateValue);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return date <= yesterday;
  }

  /**
   * 日付をパース（シリアル値対応）
   */
  private parseDate(dateValue: any): Date {
    // シリアル値の場合（数値）
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + dateValue * 86400000);
    }

    // 文字列の場合
    return new Date(dateValue);
  }

  /**
   * 担当者名から専任公開中ステータスを取得
   */
  private getAssigneeStatus(assignee: string): string {
    const mapping = this.loadStaffMapping();
    return mapping[assignee] || '専任・公開中';
  }

  /**
   * 担当者マッピングを読み込み
   */
  private loadStaffMapping(): Record<string, string> {
    // ハードコード（設定ファイルから読み込むことも可能）
    return {
      '山本': 'Y専任公開中',
      '生野': '生・専任公開中',
      '久': '久・専任公開中',
      '裏': 'U専任公開中',
      '林': '林・専任公開中',
      '国広': 'K専任公開中',
      '木村': 'R専任公開中',
      '角井': 'I専任公開中',
    };
  }

}

// シングルトンインスタンス
let propertyListingSyncServiceInstance: PropertyListingSyncService | null = null;

export function getPropertyListingSyncService(): PropertyListingSyncService {
  if (!propertyListingSyncServiceInstance) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    propertyListingSyncServiceInstance = new PropertyListingSyncService(supabaseUrl, supabaseServiceKey);
  }
  return propertyListingSyncServiceInstance;
}
