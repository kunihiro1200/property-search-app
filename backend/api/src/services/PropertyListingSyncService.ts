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
import { GoogleSheetsClient } from '../../../src/services/GoogleSheetsClient';
import { PropertyImageService } from '../../../src/services/PropertyImageService';

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

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.propertyImageService = new PropertyImageService();
  }

  /**
   * Google Sheets クライアントを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. 物件リストスプレッドシート（メインソース）
      const propertyListConfig = {
        spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
        sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      };
      
      this.propertyListSheetsClient = new GoogleSheetsClient(propertyListConfig);
      await this.propertyListSheetsClient.authenticate();
      console.log('✅ Property list spreadsheet client initialized');

      // 2. 業務依頼シート（補助情報：スプシURL取得用）
      const gyomuListConfig = {
        spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
        sheetName: process.env.GYOMU_LIST_SHEET_NAME || '業務依頼',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      };
      
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
   * 業務依頼シートからスプシURLを取得
   */
  private async getSpreadsheetUrlFromGyomuList(propertyNumber: string): Promise<string | null> {
    if (!this.gyomuListSheetsClient) {
      return null;
    }

    try {
      const rows = await this.gyomuListSheetsClient.readAll();
      
      for (const row of rows) {
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
   * フル同期を実行
   * 物件リストスプレッドシートからproperty_listingsテーブルを同期
   */
  async runFullSync(triggeredBy: 'scheduled' | 'manual' = 'scheduled'): Promise<PropertyListingSyncResult> {
    const startTime = new Date();
    console.log(`🔄 Starting property listings sync (triggered by: ${triggeredBy})`);

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
      // 1. 物件リストスプレッドシートから最後の10行のみを取得（最近追加された物件）
      console.log('📋 Fetching last 10 non-empty rows from property list spreadsheet...');
      
      // まず全体の行数を取得（ヘッダー行を含む）
      const allRows = await this.propertyListSheetsClient.readAll();
      const totalRows = allRows.length;
      
      if (totalRows === 0) {
        console.log('⚠️ No data found in property list spreadsheet');
        result.success = true;
        result.endTime = new Date();
        return result;
      }
      
      // 空行を除外してから最後の10行を取得
      const nonEmptyRows = allRows.filter(row => {
        const propertyNumber = row['物件番号'];
        return propertyNumber && String(propertyNumber).trim() !== '';
      });
      
      const rows = nonEmptyRows.slice(-10);
      
      if (!rows || rows.length === 0) {
        console.log('⚠️ No non-empty rows found');
        result.success = true;
        result.endTime = new Date();
        return result;
      }

      console.log(`📊 Processing last ${rows.length} non-empty rows (out of ${nonEmptyRows.length} non-empty rows, ${totalRows} total)`);

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
          const atbbStatus = String(row['atbb_status'] || row['ATBB_status'] || row['ステータス'] || '');
          
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
          let storageLocation = existing?.storage_location || null;
          
          if (!storageLocation) {
            console.log(`  🔍 Searching for Google Drive folder...`);
            storageLocation = await this.propertyImageService.getImageFolderUrl(propertyNumber);
            
            if (storageLocation) {
              console.log(`  ✅ Found folder: ${storageLocation}`);
            } else {
              console.log(`  ⚠️ Folder not found in Google Drive`);
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
          const propertyData = {
            property_number: propertyNumber,
            property_address: String(row['物件所在'] || row['住所'] || ''),
            atbb_status: atbbStatus,
            storage_location: storageLocation,
            spreadsheet_url: spreadsheetUrl,
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
      console.log('📊 Property Listings Sync Summary:');
      console.log(`   Total processed: ${result.totalProcessed}`);
      console.log(`   ✅ Added: ${result.successfullyAdded}`);
      console.log(`   ✅ Updated: ${result.successfullyUpdated}`);
      console.log(`   ❌ Failed: ${result.failed}`);
      console.log(`   Duration: ${result.endTime.getTime() - result.startTime.getTime()}ms`);
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
