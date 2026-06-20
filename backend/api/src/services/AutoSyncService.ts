/**
 * 自動同期サービス
 * 
 * スプレッドシートからDBへの自動同期を管理します。
 * サーバー起動時や定期的に新規データを同期します。
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { ColumnMapper } from './ColumnMapper';
import { PropertySyncHandler } from './PropertySyncHandler';
import { PropertyListingSyncService } from './PropertyListingSyncService';
import { encrypt } from '../utils/encryption';

export interface AutoSyncResult {
  success: boolean;
  newSellersCount: number;
  updatedSellersCount: number;
  propertyListingsUpdated: number;
  errors: string[];
  duration: number;
}

export class AutoSyncService {
  private supabase: SupabaseClient;
  private sheetsClient: GoogleSheetsClient | null = null;
  private columnMapper: ColumnMapper;
  private propertySyncHandler: PropertySyncHandler;
  private propertyListingSyncService: PropertyListingSyncService | null = null;
  private isInitialized = false;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.columnMapper = new ColumnMapper();
    this.propertySyncHandler = new PropertySyncHandler(this.supabase);
  }

  /**
   * Google Sheets クライアントを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const sheetsConfig = {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
        sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      };
      
      this.sheetsClient = new GoogleSheetsClient(sheetsConfig);
      await this.sheetsClient.authenticate();
      
      // 物件リスト同期サービスを初期化（業務リストシート用）
      const propertyListingConfig = {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
        sheetName: '業務リスト',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      };
      const propertyListingSheetsClient = new GoogleSheetsClient(propertyListingConfig);
      await propertyListingSheetsClient.authenticate();
      this.propertyListingSyncService = new PropertyListingSyncService(propertyListingSheetsClient);
      
      this.isInitialized = true;
      console.log('✅ AutoSyncService initialized (including PropertyListingSyncService)');
    } catch (error: any) {
      console.error('❌ AutoSyncService initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * 数値をパース
   */
  private parseNumeric(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    const str = String(value).replace(/,/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  /**
   * 新規売主を自動同期
   * DBに存在しない売主番号のデータをスプレッドシートから同期します
   */
  async syncNewSellers(): Promise<AutoSyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let newSellersCount = 0;
    let updatedSellersCount = 0;

    try {
      if (!this.isInitialized || !this.sheetsClient) {
        await this.initialize();
      }

      console.log('🔄 Auto-sync: Checking for new sellers...');

      // DBから最新の売主番号を取得
      const { data: latestSeller } = await this.supabase
        .from('sellers')
        .select('seller_number')
        .order('seller_number', { ascending: false })
        .limit(1)
        .single();

      const latestSellerNumber = latestSeller?.seller_number || 'AA0';
      console.log(`📊 Latest seller in DB: ${latestSellerNumber}`);

      // スプレッドシートから全データを取得
      const allRows = await this.sheetsClient!.readAll();
      console.log(`📊 Total rows in spreadsheet: ${allRows.length}`);

      // DBに存在しない売主を特定（売主番号が最新より大きいもの）
      const newRows = allRows.filter((row: any) => {
        const sellerNumber = row['売主番号'];
        if (!sellerNumber) return false;
        
        // 売主番号を数値で比較（AA13244 -> 13244）
        const currentNum = parseInt(sellerNumber.replace('AA', ''), 10);
        const latestNum = parseInt(latestSellerNumber.replace('AA', ''), 10);
        return currentNum > latestNum;
      });

      console.log(`🆕 New sellers to sync: ${newRows.length}`);

      if (newRows.length === 0) {
        console.log('✅ No new sellers to sync');
        return {
          success: true,
          newSellersCount: 0,
          updatedSellersCount: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // 新規売主を同期
      for (const row of newRows) {
        const sellerNumber = row['売主番号'];
        
        try {
          const mappedData = this.columnMapper.mapToDatabase(row);
          
          // 査定額を取得（手入力優先、なければ自動計算）
          const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
          const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
          const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];

          const encryptedData: any = {
            seller_number: sellerNumber,
            name: mappedData.name ? encrypt(mappedData.name) : null,
            address: mappedData.address ? encrypt(mappedData.address) : null,
            phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
            email: mappedData.email ? encrypt(mappedData.email) : null,
            status: mappedData.status || '追客中',
            next_call_date: mappedData.next_call_date || null,
          };

          // 査定額を追加
          const val1 = this.parseNumeric(valuation1);
          const val2 = this.parseNumeric(valuation2);
          const val3 = this.parseNumeric(valuation3);
          if (val1 !== null) encryptedData.valuation_amount_1 = val1 * 10000;
          if (val2 !== null) encryptedData.valuation_amount_2 = val2 * 10000;
          if (val3 !== null) encryptedData.valuation_amount_3 = val3 * 10000;

          const { data: newSeller, error: insertError } = await this.supabase
            .from('sellers')
            .insert(encryptedData)
            .select()
            .single();

          if (insertError) {
            throw new Error(insertError.message);
          }

          // 物件情報を同期（直接スプレッドシートから取得）
          if (newSeller) {
            const propertyAddress = row['物件所在地'] || '未入力';
            let propertyType = row['種別'];
            if (propertyType) {
              const typeStr = String(propertyType).trim();
              const typeMapping: Record<string, string> = {
                '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
              };
              propertyType = typeMapping[typeStr] || typeStr;
            }

            await this.propertySyncHandler.syncProperty(newSeller.id, {
              address: String(propertyAddress),
              property_type: propertyType ? String(propertyType) : undefined,
              land_area: this.parseNumeric(row['土（㎡）']) ?? undefined,
              building_area: this.parseNumeric(row['建（㎡）']) ?? undefined,
              build_year: this.parseNumeric(row['築年']) ?? undefined,
              structure: row['構造'] ? String(row['構造']) : undefined,
              seller_situation: row['状況（売主）'] ? String(row['状況（売主）']) : undefined,
              floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
            });
          }

          newSellersCount++;
          console.log(`✅ ${sellerNumber}: Created`);
        } catch (error: any) {
          errors.push(`${sellerNumber}: ${error.message}`);
          console.error(`❌ ${sellerNumber}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`🎉 Auto-sync completed: ${newSellersCount} new, ${errors.length} errors, ${duration}ms`);

      // 物件リスト更新同期を実行（要件1: 自動同期サービスの起動確認と修正）
      let propertyListingsUpdated = 0;
      if (this.propertyListingSyncService) {
        try {
          console.log('🔄 Starting property listing update sync...');
          const propertyListingResult = await this.propertyListingSyncService.syncUpdatedPropertyListings();
          propertyListingsUpdated = propertyListingResult.updated;
          console.log(`✅ Property listing sync: ${propertyListingsUpdated} updated`);
          
          if (propertyListingResult.failed > 0) {
            propertyListingResult.errors?.forEach(err => {
              errors.push(`${err.property_number}: ${err.error}`);
            });
          }
        } catch (error: any) {
          console.error('❌ Property listing sync failed:', error.message);
          errors.push(`Property listing sync: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        newSellersCount,
        updatedSellersCount,
        propertyListingsUpdated,
        errors,
        duration,
      };

    } catch (error: any) {
      console.error('❌ Auto-sync failed:', error.message);
      return {
        success: false,
        newSellersCount,
        updatedSellersCount,
        propertyListingsUpdated: 0,
        errors: [error.message],
        duration: Date.now() - startTime,
      };
    }
  }
}

// シングルトンインスタンス
let autoSyncServiceInstance: AutoSyncService | null = null;

export function getAutoSyncService(): AutoSyncService {
  if (!autoSyncServiceInstance) {
    autoSyncServiceInstance = new AutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return autoSyncServiceInstance;
}

/**
 * 定期同期マネージャー
 * 指定間隔でスプレッドシートからDBへの同期を実行します
 */
export class PeriodicSyncManager {
  private intervalId: NodeJS.Timeout | null = null;
  private autoSyncService: AutoSyncService;
  private intervalMinutes: number;
  private isRunning = false;

  constructor(intervalMinutes: number = 5) {
    this.autoSyncService = getAutoSyncService();
    this.intervalMinutes = intervalMinutes;
  }

  /**
   * 定期同期を開始
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Periodic sync is already running');
      return;
    }

    try {
      await this.autoSyncService.initialize();
      this.isRunning = true;

      // 初回実行
      console.log(`🔄 Starting periodic sync (interval: ${this.intervalMinutes} minutes)`);
      await this.runSync();

      // 定期実行を設定
      this.intervalId = setInterval(async () => {
        await this.runSync();
      }, this.intervalMinutes * 60 * 1000);

      console.log(`✅ Periodic sync started (every ${this.intervalMinutes} minutes)`);
    } catch (error: any) {
      console.error('❌ Failed to start periodic sync:', error.message);
      this.isRunning = false;
    }
  }

  /**
   * 定期同期を停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Periodic sync stopped');
  }

  /**
   * 同期を実行
   */
  private async runSync(): Promise<void> {
    try {
      const result = await this.autoSyncService.syncNewSellers();
      if (result.newSellersCount > 0) {
        console.log(`📊 Periodic sync: ${result.newSellersCount} new sellers synced`);
      }
    } catch (error: any) {
      console.error('⚠️ Periodic sync error:', error.message);
    }
  }

  /**
   * 実行中かどうか
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 同期間隔を取得
   */
  getIntervalMinutes(): number {
    return this.intervalMinutes;
  }
}

// 定期同期マネージャーのシングルトン
let periodicSyncManagerInstance: PeriodicSyncManager | null = null;

export function getPeriodicSyncManager(intervalMinutes?: number): PeriodicSyncManager {
  if (!periodicSyncManagerInstance) {
    periodicSyncManagerInstance = new PeriodicSyncManager(
      intervalMinutes || parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '5', 10)
    );
  }
  return periodicSyncManagerInstance;
}
