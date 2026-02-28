/**
 * 物件リスト同期サービス
 * 
 * 同期フロー:
 * 1. 物件スプシ（物件リストスプレッドシート）から物件データを取得 ← メインソース
 * 2. property_listingsテーブルに同期
 * 3. 業務依頼シートから「スプシURL」を取得して補完 ← 補助情報（フル同期のみ）
 * 
 * 同期トリガー:
 * - Vercel Cron Job（runScheduledSync: 軽量版）
 * - 手動実行（runFullSync: フル版）
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

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const propertyListConfig: any = {
        spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
        sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      };
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        propertyListConfig.serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
      }
      this.propertyListSheetsClient = new GoogleSheetsClient(propertyListConfig);
      await this.propertyListSheetsClient.authenticate();
      console.log('✅ Property list spreadsheet client initialized');

      const gyomuListConfig: any = {
        spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
        sheetName: process.env.GYOMU_LIST_SHEET_NAME || '業務依頼',
      };
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

  private async loadGyomuListCache(): Promise<void> {
    if (this.gyomuListCache !== null) {
      console.log('  📦 Using cached gyomu list data');
      return;
    }
    if (!this.gyomuListSheetsClient) return;
    try {
      console.log('  🔄 Loading gyomu list data...');
      this.gyomuListCache = await this.gyomuListSheetsClient.readAll();
      console.log(`  ✅ Gyomu list data loaded (${this.gyomuListCache.length} rows)`);
    } catch (error: any) {
      console.error(`  ❌ Error loading gyomu list data:`, error.message);
      this.gyomuListCache = [];
    }
  }

  private async getSpreadsheetUrlFromGyomuList(propertyNumber: string): Promise<string | null> {
    await this.loadGyomuListCache();
    if (!this.gyomuListCache) return null;
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

  private async getStorageLocationFromGyomuList(propertyNumber: string): Promise<string | null> {
    await this.loadGyomuListCache();
    if (!this.gyomuListCache) return null;
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
   * 【cron用・軽量版】スケジュール同期
   * 
   * Google Sheets APIクォータを節約するため、以下の2つのみ実行：
   * 1. 新規物件チェック: スプレッドシート末尾10行（空白除く）をチェックしてDBになければ追加
   * 2. 更新チェック: 全件の atbb_status・価格（sales_price/listing_price）のみ更新
   * 
   * 業務依頼シートへのAPIコールは一切行わない（クォータ節約）
   * storage_location / spreadsheet_url は既存のDB値を保持
   */
  async runScheduledSync(): Promise<PropertyListingSyncResult> {
    const startTime = new Date();
    console.log('🔄 Starting scheduled sync (lightweight mode)...');

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
      triggeredBy: 'scheduled',
    };

    try {
      // スプレッドシートの全行を1回だけ取得（1 API call）
      console.log('📋 Fetching all rows from property list spreadsheet...');
      const allRows = await this.propertyListSheetsClient.readAll();

      // 空行を除外
      const nonEmptyRows = allRows.filter(row => {
        const pn = row['物件番号'];
        return pn && String(pn).trim() !== '';
      });

      console.log(`📊 Total non-empty rows: ${nonEmptyRows.length}`);

      if (nonEmptyRows.length === 0) {
        result.success = true;
        result.endTime = new Date();
        return result;
      }

      // ── Phase 1: 新規物件チェック（末尾10行のみ） ──────────────────
      console.log('📥 Phase 1: Checking last 10 rows for new properties...');
      const tailRows = nonEmptyRows.slice(-10);

      for (const row of tailRows) {
        const propertyNumber = String(row['物件番号'] || '').trim();
        if (!propertyNumber) continue;

        result.totalProcessed++;

        try {
          const { data: existing, error: fetchError } = await this.supabase
            .from('property_listings')
            .select('id')
            .eq('property_number', propertyNumber)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

          if (!existing) {
            const atbbStatus = String(
              row['atbb成約済み/非公開'] || row['atbb_status'] || row['ATBB_status'] || row['ステータス'] || ''
            );
            const salesPrice = row['売買価格']
              ? parseFloat(String(row['売買価格']).replace(/,/g, ''))
              : null;
            const listingPrice = row['売出価格']
              ? parseFloat(String(row['売出価格']).replace(/,/g, ''))
              : null;

            const { error: insertError } = await this.supabase
              .from('property_listings')
              .insert({
                property_number: propertyNumber,
                address: String(row['所在地'] || ''),
                display_address: String(row['住居表示（ATBB登録住所）'] || ''),
                property_type: String(row['種別'] || ''),
                sales_price: salesPrice,
                listing_price: listingPrice,
                buyer_name: String(row['名前（買主）'] || ''),
                seller_name: String(row['名前(売主）'] || ''),
                land_area: row['土地面積'] ? parseFloat(String(row['土地面積'])) : null,
                building_area: row['建物面積'] ? parseFloat(String(row['建物面積'])) : null,
                atbb_status: atbbStatus,
                status: String(row['状況'] || ''),
                google_map_url: String(row['GoogleMap'] || ''),
                current_status: String(row['●現況'] || ''),
                delivery: String(row['引渡し'] || ''),
                distribution_date: row['配信日【公開）'] ? String(row['配信日【公開）']) : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (insertError) throw insertError;

            console.log(`  ✅ Added new property: ${propertyNumber}`);
            result.successfullyAdded++;
          }
        } catch (error: any) {
          console.error(`  ❌ Error processing ${propertyNumber}:`, error.message);
          result.failed++;
          result.errors.push({ propertyNumber, message: error.message });
        }
      }

      // ── Phase 2: atbb_status・価格の更新チェック（全件） ────────────
      console.log('🔄 Phase 2: Updating atbb_status and prices for all rows...');

      for (const row of nonEmptyRows) {
        const propertyNumber = String(row['物件番号'] || '').trim();
        if (!propertyNumber) continue;

        result.totalProcessed++;

        try {
          const atbbStatus = String(
            row['atbb成約済み/非公開'] || row['atbb_status'] || row['ATBB_status'] || row['ステータス'] || ''
          );
          const salesPrice = row['売買価格']
            ? parseFloat(String(row['売買価格']).replace(/,/g, ''))
            : null;
          const listingPrice = row['売出価格']
            ? parseFloat(String(row['売出価格']).replace(/,/g, ''))
            : null;

          // distribution_date を取得（カラム名: 配信日【公開））
          const distVal = row['配信日【公開）'] || null;

          // atbb_status・価格・配信日を更新
          const { error: updateError } = await this.supabase
            .from('property_listings')
            .update({
              atbb_status: atbbStatus,
              sales_price: salesPrice,
              listing_price: listingPrice,
              distribution_date: distVal ? String(distVal) : null,
              updated_at: new Date().toISOString(),
            })
            .eq('property_number', propertyNumber);

          if (updateError) throw updateError;

          result.successfullyUpdated++;
        } catch (error: any) {
          console.error(`  ❌ Error updating ${propertyNumber}:`, error.message);
          result.failed++;
          result.errors.push({ propertyNumber, message: error.message });
        }
      }

      result.success = result.failed === 0;
      result.endTime = new Date();

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 Scheduled Sync Summary:');
      console.log(`   ✅ New properties added: ${result.successfullyAdded}`);
      console.log(`   ✅ Properties updated (atbb_status/price): ${result.successfullyUpdated}`);
      console.log(`   ❌ Failed: ${result.failed}`);
      console.log(`   Duration: ${result.endTime.getTime() - result.startTime.getTime()}ms`);
      console.log('═══════════════════════════════════════════════════════════');

      return result;

    } catch (error: any) {
      console.error('❌ Error in scheduled sync:', error);
      result.success = false;
      result.endTime = new Date();
      result.errors.push({ propertyNumber: 'N/A', message: error.message });
      return result;
    }
  }

  /**
   * 【手動実行用・フル同期】
   * 全件を処理し、storage_location・spreadsheet_url・distribution_date等も更新する。
   * 業務依頼シートへのAPIコールも実行する。
   */
  async runFullSync(
    triggeredBy: 'scheduled' | 'manual' = 'manual',
    batchSize: number = 100,
    startIndex: number = 0
  ): Promise<PropertyListingSyncResult> {
    const startTime = new Date();
    console.log(`🔄 Starting FULL sync (triggered by: ${triggeredBy}, batch: ${startIndex}-${startIndex + batchSize})`);

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
      console.log('📋 Fetching all rows from property list spreadsheet...');
      const allRows = await this.propertyListSheetsClient.readAll();
      const totalRows = allRows.length;

      if (totalRows === 0) {
        console.log('⚠️ No data found in property list spreadsheet');
        result.success = true;
        result.endTime = new Date();
        return result;
      }

      const nonEmptyRows = allRows.filter(row => {
        const propertyNumber = row['物件番号'];
        return propertyNumber && String(propertyNumber).trim() !== '';
      });

      console.log(`📊 Total non-empty rows: ${nonEmptyRows.length} (out of ${totalRows} total rows)`);

      const endIndex = Math.min(startIndex + batchSize, nonEmptyRows.length);
      const rows = nonEmptyRows.slice(startIndex, endIndex);

      if (rows.length === 0) {
        console.log('⚠️ No rows to process in this batch');
        result.success = true;
        result.endTime = new Date();
        return result;
      }

      console.log(`📊 Processing batch ${startIndex}-${endIndex} (${rows.length} rows)`);

      for (const row of rows) {
        result.totalProcessed++;

        try {
          const propertyNumber = String(row['物件番号'] || '');
          if (!propertyNumber) continue;

          const atbbStatus = String(
            row['atbb成約済み/非公開'] || row['atbb_status'] || row['ATBB_status'] || row['ステータス'] || ''
          );

          console.log(`📝 Processing ${propertyNumber} (atbb_status: ${atbbStatus})...`);

          const { data: existing, error: fetchError } = await this.supabase
            .from('property_listings')
            .select('id, property_number, atbb_status, storage_location, spreadsheet_url')
            .eq('property_number', propertyNumber)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

          // storage_location: 既存のDB値（URL形式）を優先、なければ業務依頼シート→Google Drive
          let storageLocation = existing?.storage_location || null;
          if (storageLocation && !String(storageLocation).startsWith('https://drive.google.com/drive/')) {
            storageLocation = null;
          }

          if (!storageLocation) {
            const gyomuStorageLocation = await this.getStorageLocationFromGyomuList(propertyNumber);
            if (
              gyomuStorageLocation &&
              String(gyomuStorageLocation).trim() !== '' &&
              String(gyomuStorageLocation).startsWith('https://drive.google.com/drive/')
            ) {
              storageLocation = String(gyomuStorageLocation);
            } else {
              storageLocation = await this.propertyImageService.getImageFolderUrl(propertyNumber);
            }
          }

          // spreadsheet_url: 既存のDB値を優先、なければ業務依頼シート
          let spreadsheetUrl = existing?.spreadsheet_url || null;
          if (!spreadsheetUrl) {
            spreadsheetUrl = await this.getSpreadsheetUrlFromGyomuList(propertyNumber);
          }

          // distribution_date: 複数のカラム名を試す（文字コードの違いに対応）
          const distVal =
            row['配信日【公開）'] ||
            row['配信日【公開)'] ||
            row['配信日(公開)'] ||
            row['配信日（公開）'] ||
            null;

          // デバッグ: 最初の3件は配信日カラム名を出力
          if (result.totalProcessed <= 3) {
            const distKeys = Object.keys(row).filter(
              (k: string) => k.includes('配信') || k.includes('公開')
            );
            console.log(
              `🔍 [DEBUG] ${propertyNumber} distribution keys:`,
              JSON.stringify(distKeys),
              'value:',
              distVal
            );
          }

          const propertyData: any = {
            property_number: propertyNumber,
            address: String(row['所在地'] || ''),
            display_address: String(row['住居表示（ATBB登録住所）'] || ''),
            property_type: String(row['種別'] || ''),
            sales_price: row['売買価格']
              ? parseFloat(String(row['売買価格']).replace(/,/g, ''))
              : null,
            buyer_name: String(row['名前（買主）'] || ''),
            seller_name: String(row['名前(売主）'] || ''),
            land_area: row['土地面積'] ? parseFloat(String(row['土地面積'])) : null,
            building_area: row['建物面積'] ? parseFloat(String(row['建物面積'])) : null,
            listing_price: row['売出価格']
              ? parseFloat(String(row['売出価格']).replace(/,/g, ''))
              : null,
            atbb_status: atbbStatus,
            status: String(row['状況'] || ''),
            storage_location: storageLocation,
            spreadsheet_url: spreadsheetUrl,
            google_map_url: String(row['GoogleMap'] || ''),
            current_status: String(row['●現況'] || ''),
            delivery: String(row['引渡し'] || ''),
            distribution_date: distVal ? String(distVal) : null,
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            const { error: updateError } = await this.supabase
              .from('property_listings')
              .update(propertyData)
              .eq('id', existing.id);
            if (updateError) throw updateError;
            console.log(`  ✅ Updated ${propertyNumber}`);
            result.successfullyUpdated++;
          } else {
            const { error: insertError } = await this.supabase
              .from('property_listings')
              .insert({ ...propertyData, created_at: new Date().toISOString() });
            if (insertError) throw insertError;
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
      console.log('📊 Full Sync Summary (Batch):');
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
      console.error('❌ Error in full sync:', error);
      result.success = false;
      result.endTime = new Date();
      result.errors.push({ propertyNumber: 'N/A', message: error.message });
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
