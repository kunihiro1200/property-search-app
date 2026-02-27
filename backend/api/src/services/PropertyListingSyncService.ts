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
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { PropertyImageService } from './PropertyImageService';
import { GoogleDriveService } from './GoogleDriveService';

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
    this.propertyImageService = new PropertyImageService(new GoogleDriveService());
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
            distribution_date: (() => {
              // 複数のカラム名を試す（文字コードの違いに対応）
              const val = row['配信日【公開）'] || row['配信日【公開)'] || row['配信日(公開)'] || row['配信日（公開）'] || null;
              if (result.totalProcessed <= 3) {
                const distKeys = Object.keys(row).filter((k: string) => k.includes('配信') || k.includes('公開'));
                console.log(`🔍 [DEBUG] ${propertyNumber} distribution keys:`, JSON.stringify(distKeys), 'value:', val);
              }
              return val ? String(val) : null;
            })(),
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
