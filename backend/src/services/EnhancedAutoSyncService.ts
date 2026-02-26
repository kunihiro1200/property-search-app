/**
 * 強化版自動同期サービス
 * 
 * スプレッドシートからDBへの自動同期を管理します。
 * 全件比較方式で不足データを検出し、確実に同期します。
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { ColumnMapper } from './ColumnMapper';
import { PropertySyncHandler } from './PropertySyncHandler';
import { encrypt } from '../utils/encryption';
import {
  ValidationResult,
  DeletionResult,
  DeletionSyncResult,
  CompleteSyncResult,
  DeletionSyncConfig,
  RecoveryResult,
} from '../types/deletion';

export interface SyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  newSellersCount: number;
  updatedSellersCount: number;
  errors: SyncError[];
  missingSellersDetected: number;
  triggeredBy: 'scheduled' | 'manual';
}

export interface SyncError {
  sellerNumber: string;
  message: string;
  timestamp: Date;
}

export interface SyncHealthStatus {
  isHealthy: boolean;
  lastSyncTime: Date | null;
  lastSyncSuccess: boolean;
  pendingMissingSellers: number;
  syncIntervalMinutes: number;
  nextScheduledSync: Date | null;
  consecutiveFailures: number;
}

export class EnhancedAutoSyncService {
  private supabase: SupabaseClient;
  private sheetsClient: GoogleSheetsClient | null = null;
  private columnMapper: ColumnMapper;
  private propertySyncHandler: PropertySyncHandler;
  private isInitialized = false;

  // スプレッドシートキャッシュ（Google Sheets APIクォータ対策）
  private spreadsheetCache: any[] | null = null;
  private spreadsheetCacheExpiry: number = 0;
  private readonly SPREADSHEET_CACHE_TTL = 30 * 60 * 1000; // 30分間キャッシュ（Google Sheets APIクォータ対策）

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
      this.isInitialized = true;
      console.log('✅ EnhancedAutoSyncService initialized');
    } catch (error: any) {
      console.error('❌ EnhancedAutoSyncService initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * スプレッドシートデータを取得（キャッシュ対応）
   * Google Sheets APIクォータ対策のため、5分間キャッシュします
   */
  private async getSpreadsheetData(forceRefresh: boolean = false): Promise<any[]> {
    const now = Date.now();

    // 強制リフレッシュでない場合、キャッシュが有効なら使用
    if (!forceRefresh && this.spreadsheetCache && now < this.spreadsheetCacheExpiry) {
      console.log('📦 Using cached spreadsheet data (valid for', Math.round((this.spreadsheetCacheExpiry - now) / 1000), 'seconds)');
      return this.spreadsheetCache;
    }

    // キャッシュが無効な場合は再取得
    console.log('🔄 Fetching fresh spreadsheet data...');
    if (!this.isInitialized || !this.sheetsClient) {
      await this.initialize();
    }

    const allRows = await this.sheetsClient!.readAll();
    this.spreadsheetCache = allRows;
    this.spreadsheetCacheExpiry = now + this.SPREADSHEET_CACHE_TTL;
    
    console.log(`✅ Spreadsheet data cached (${allRows.length} rows, valid for 30 minutes)`);
    return allRows;
  }

  /**
   * スプレッドシートキャッシュをクリア
   */
  public clearSpreadsheetCache(): void {
    this.spreadsheetCache = null;
    this.spreadsheetCacheExpiry = 0;
    console.log('🗑️ Spreadsheet cache cleared');
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

  // combineInquiryDateAndYear メソッドを削除
  // inquiry_date カラムは存在しないため、このメソッドは不要

  /**
   * DBから全売主番号を取得（ページネーション対応）
   * Supabaseのデフォルト制限（1000件）を回避するため、ページングで全件取得
   */
  private async getAllDbSellerNumbers(): Promise<Set<string>> {
    const allSellerNumbers = new Set<string>();
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('sellers')
        .select('seller_number')
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch DB sellers: ${error.message}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        for (const seller of data) {
          if (seller.seller_number) {
            allSellerNumbers.add(seller.seller_number);
          }
        }
        offset += pageSize;
        
        // 取得件数がページサイズ未満なら終了
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
    }

    return allSellerNumbers;
  }

  /**
   * スプレッドシートにあってDBにない売主番号を検出
   * 全件比較方式で確実に不足データを検出します
   */
  async detectMissingSellers(): Promise<string[]> {
    if (!this.isInitialized || !this.sheetsClient) {
      await this.initialize();
    }

    console.log('🔍 Detecting missing sellers (full comparison)...');

    // スプレッドシートから全売主番号を取得（キャッシュ対応）
    const allRows = await this.getSpreadsheetData();
    const sheetSellerNumbers = new Set<string>();
    
    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (sellerNumber && typeof sellerNumber === 'string' && sellerNumber.startsWith('AA')) {
        sheetSellerNumbers.add(sellerNumber);
      }
    }
    console.log(`📊 Spreadsheet sellers: ${sheetSellerNumbers.size}`);

    // DBから全売主番号を取得（ページネーション対応）
    const dbSellerNumbers = await this.getAllDbSellerNumbers();
    console.log(`📊 Database sellers: ${dbSellerNumbers.size}`);

    // 差分を計算（スプレッドシートにあってDBにないもの）
    const missingSellers: string[] = [];
    for (const sellerNumber of sheetSellerNumbers) {
      if (!dbSellerNumbers.has(sellerNumber)) {
        missingSellers.push(sellerNumber);
      }
    }

    // 売主番号でソート
    missingSellers.sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    console.log(`🆕 Missing sellers: ${missingSellers.length}`);
    if (missingSellers.length > 0) {
      console.log(`   First few: ${missingSellers.slice(0, 5).join(', ')}${missingSellers.length > 5 ? '...' : ''}`);
    }

    return missingSellers;
  }

  /**
   * DBにあってスプレッドシートにない売主番号を検出（削除された売主）
   * 全件比較方式で削除された売主を検出します
   */
  async detectDeletedSellers(): Promise<string[]> {
    if (!this.isInitialized || !this.sheetsClient) {
      await this.initialize();
    }

    console.log('🔍 Detecting deleted sellers (full comparison)...');

    // スプレッドシートから全売主番号を取得（キャッシュ対応）
    const allRows = await this.getSpreadsheetData();
    const sheetSellerNumbers = new Set<string>();
    
    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (sellerNumber && typeof sellerNumber === 'string' && sellerNumber.startsWith('AA')) {
        sheetSellerNumbers.add(sellerNumber);
      }
    }
    console.log(`📊 Spreadsheet sellers: ${sheetSellerNumbers.size}`);

    // DBから全アクティブ売主番号を取得（ページネーション対応、削除済みを除外）
    const dbSellerNumbers = await this.getAllActiveDbSellerNumbers();
    console.log(`📊 Active database sellers: ${dbSellerNumbers.size}`);

    // 差分を計算（DBにあってスプレッドシートにないもの = 削除された売主）
    const deletedSellers: string[] = [];
    for (const sellerNumber of dbSellerNumbers) {
      if (!sheetSellerNumbers.has(sellerNumber)) {
        deletedSellers.push(sellerNumber);
      }
    }

    // 売主番号でソート
    deletedSellers.sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    console.log(`🗑️  Deleted sellers: ${deletedSellers.length}`);
    if (deletedSellers.length > 0) {
      console.log(`   First few: ${deletedSellers.slice(0, 5).join(', ')}${deletedSellers.length > 5 ? '...' : ''}`);
    }

    return deletedSellers;
  }

  /**
   * DBから全アクティブ売主番号を取得（削除済みを除外）
   * ページネーション対応で全件取得
   */
  private async getAllActiveDbSellerNumbers(): Promise<Set<string>> {
    const allSellerNumbers = new Set<string>();
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('sellers')
        .select('seller_number')
        .is('deleted_at', null) // 削除済みを除外
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch active DB sellers: ${error.message}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        for (const seller of data) {
          if (seller.seller_number) {
            allSellerNumbers.add(seller.seller_number);
          }
        }
        offset += pageSize;
        
        // 取得件数がページサイズ未満なら終了
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
    }

    return allSellerNumbers;
  }

  /**
   * 削除前のバリデーション
   * アクティブな契約、最近のアクティビティ、アクティブな物件リストをチェック
   */
  private async validateDeletion(sellerNumber: string): Promise<ValidationResult> {
    const config = this.getDeletionSyncConfig();
    
    try {
      // 売主情報を取得
      const { data: seller, error } = await this.supabase
        .from('sellers')
        .select('*')
        .eq('seller_number', sellerNumber)
        .is('deleted_at', null)
        .single();

      if (error || !seller) {
        return {
          canDelete: false,
          reason: 'Seller not found in database',
          requiresManualReview: false,
        };
      }

      const details: ValidationResult['details'] = {
        contractStatus: seller.status,
      };

      // 1. アクティブな契約をチェック
      // 専任契約中・一般契約中の売主は削除をブロック
      const activeContractStatuses = ['専任契約中', '一般契約中'];
      if (activeContractStatuses.includes(seller.status)) {
        details.hasActiveContract = true;
        return {
          canDelete: false,
          reason: `Active contract: ${seller.status}`,
          requiresManualReview: true,
          details,
        };
      }

      // 注意: 以下のチェックは削除済み（2026-01-31）
      // - 最近のアクティビティチェック（7日以内の更新）
      // - 将来の電話予定チェック
      // スプレッドシートから削除されたら即座に削除同期する

      // 2. アクティブな物件リストをチェック
      const { data: propertyListings, error: listingsError } = await this.supabase
        .from('property_listings')
        .select('id')
        .eq('seller_id', seller.id)
        .is('deleted_at', null)
        .limit(1);

      if (!listingsError && propertyListings && propertyListings.length > 0) {
        details.hasActivePropertyListings = true;
        
        if (config.strictValidation) {
          return {
            canDelete: false,
            reason: 'Has active property listings',
            requiresManualReview: true,
            details,
          };
        }
      }

      // すべてのチェックをパス
      return {
        canDelete: true,
        requiresManualReview: false,
        details,
      };

    } catch (error: any) {
      console.error(`❌ Validation error for ${sellerNumber}:`, error.message);
      return {
        canDelete: false,
        reason: `Validation error: ${error.message}`,
        requiresManualReview: true,
      };
    }
  }

  /**
   * ソフトデリートを実行
   * トランザクションで売主と関連物件を削除し、監査ログに記録
   */
  private async executeSoftDelete(sellerNumber: string): Promise<DeletionResult> {
    try {
      // 売主情報を取得
      const { data: seller, error: fetchError } = await this.supabase
        .from('sellers')
        .select('*')
        .eq('seller_number', sellerNumber)
        .is('deleted_at', null)
        .single();

      if (fetchError || !seller) {
        return {
          sellerNumber,
          success: false,
          error: 'Seller not found',
        };
      }

      const deletedAt = new Date();

      // 1. 監査ログにバックアップを作成
      const { data: auditRecord, error: auditError } = await this.supabase
        .from('seller_deletion_audit')
        .insert({
          seller_id: seller.id,
          seller_number: sellerNumber,
          deleted_at: deletedAt.toISOString(),
          deleted_by: 'auto_sync',
          reason: 'Removed from spreadsheet',
          seller_data: seller,
          can_recover: true,
        })
        .select()
        .single();

      if (auditError) {
        console.error(`❌ Failed to create audit record for ${sellerNumber}:`, auditError.message);
        return {
          sellerNumber,
          success: false,
          error: `Audit creation failed: ${auditError.message}`,
        };
      }

      // 2. 売主をソフトデリート
      const { error: sellerDeleteError } = await this.supabase
        .from('sellers')
        .update({ deleted_at: deletedAt.toISOString() })
        .eq('id', seller.id);

      if (sellerDeleteError) {
        console.error(`❌ Failed to soft delete seller ${sellerNumber}:`, sellerDeleteError.message);
        return {
          sellerNumber,
          success: false,
          error: `Seller deletion failed: ${sellerDeleteError.message}`,
        };
      }

      // 3. 関連物件をカスケードソフトデリート
      const { error: propertiesDeleteError } = await this.supabase
        .from('properties')
        .update({ deleted_at: deletedAt.toISOString() })
        .eq('seller_id', seller.id);

      if (propertiesDeleteError) {
        console.warn(`⚠️  Failed to cascade delete properties for ${sellerNumber}:`, propertiesDeleteError.message);
        // 物件削除失敗は警告のみ（売主は削除済み）
      }

      console.log(`✅ ${sellerNumber}: Soft deleted successfully`);
      
      return {
        sellerNumber,
        success: true,
        auditId: auditRecord.id,
        deletedAt,
      };

    } catch (error: any) {
      console.error(`❌ Soft delete error for ${sellerNumber}:`, error.message);
      return {
        sellerNumber,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 削除された売主を一括同期
   */
  async syncDeletedSellers(sellerNumbers: string[]): Promise<DeletionSyncResult> {
    const startedAt = new Date();
    const deletedSellerNumbers: string[] = [];
    const manualReviewSellerNumbers: string[] = [];
    const errors: Array<{ sellerNumber: string; error: string }> = [];

    console.log(`🗑️  Syncing ${sellerNumbers.length} deleted sellers...`);

    for (const sellerNumber of sellerNumbers) {
      // バリデーション
      const validation = await this.validateDeletion(sellerNumber);
      
      if (!validation.canDelete) {
        if (validation.requiresManualReview) {
          manualReviewSellerNumbers.push(sellerNumber);
          console.log(`⚠️  ${sellerNumber}: Requires manual review - ${validation.reason}`);
        } else {
          errors.push({
            sellerNumber,
            error: validation.reason || 'Validation failed',
          });
          console.log(`❌ ${sellerNumber}: ${validation.reason}`);
        }
        continue;
      }

      // ソフトデリート実行
      const result = await this.executeSoftDelete(sellerNumber);
      
      if (result.success) {
        deletedSellerNumbers.push(sellerNumber);
      } else {
        errors.push({
          sellerNumber,
          error: result.error || 'Unknown error',
        });
      }
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const syncResult: DeletionSyncResult = {
      totalDetected: sellerNumbers.length,
      successfullyDeleted: deletedSellerNumbers.length,
      failedToDelete: errors.length,
      requiresManualReview: manualReviewSellerNumbers.length,
      deletedSellerNumbers,
      manualReviewSellerNumbers,
      errors,
      startedAt,
      completedAt,
      durationMs,
    };

    console.log(`🎉 Deletion sync completed:`);
    console.log(`   ✅ Deleted: ${deletedSellerNumbers.length}`);
    console.log(`   ⚠️  Manual review: ${manualReviewSellerNumbers.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    return syncResult;
  }

  /**
   * 削除同期の設定を取得
   */
  private getDeletionSyncConfig(): DeletionSyncConfig {
    return {
      enabled: process.env.DELETION_SYNC_ENABLED !== 'false',
      strictValidation: process.env.DELETION_VALIDATION_STRICT !== 'false',
      recentActivityDays: parseInt(process.env.DELETION_RECENT_ACTIVITY_DAYS || '7', 10),
      sendAlerts: process.env.DELETION_SEND_ALERTS !== 'false',
      maxDeletionsPerSync: parseInt(process.env.DELETION_MAX_PER_SYNC || '100', 10),
    };
  }

  /**
   * 削除同期が有効かどうか
   */
  private isDeletionSyncEnabled(): boolean {
    return this.getDeletionSyncConfig().enabled;
  }

  /**
   * 削除された売主を復元
   * 
   * @param sellerNumber - 復元する売主番号
   * @param recoveredBy - 復元を実行したユーザー (default: 'manual')
   * @returns 復元結果
   */
  async recoverDeletedSeller(sellerNumber: string, recoveredBy: string = 'manual'): Promise<RecoveryResult> {
    try {
      console.log(`🔄 Attempting to recover seller: ${sellerNumber}`);

      // 1. 削除監査ログを確認
      const { data: auditLog, error: auditError } = await this.supabase
        .from('seller_deletion_audit')
        .select('*')
        .eq('seller_number', sellerNumber)
        .is('recovered_at', null)
        .order('deleted_at', { ascending: false })
        .limit(1)
        .single();

      if (auditError || !auditLog) {
        console.error(`❌ Audit log not found for ${sellerNumber}`);
        return {
          success: false,
          sellerNumber,
          error: 'Audit log not found or seller was not deleted',
        };
      }

      if (!auditLog.can_recover) {
        console.error(`❌ Recovery not allowed for ${sellerNumber}`);
        return {
          success: false,
          sellerNumber,
          error: 'Recovery is not allowed for this seller',
        };
      }

      // 2. 売主を復元 (deleted_at を NULL に設定)
      const { error: sellerRecoverError } = await this.supabase
        .from('sellers')
        .update({ deleted_at: null })
        .eq('seller_number', sellerNumber);

      if (sellerRecoverError) {
        console.error(`❌ Failed to recover seller ${sellerNumber}:`, sellerRecoverError.message);
        throw new Error(`Failed to recover seller: ${sellerRecoverError.message}`);
      }

      console.log(`✅ Seller ${sellerNumber} recovered`);

      // 3. 関連する物件を復元
      const { data: properties, error: propertiesError } = await this.supabase
        .from('properties')
        .update({ deleted_at: null })
        .eq('seller_id', auditLog.seller_id)
        .select('id');

      const propertiesRestored = properties?.length || 0;
      
      if (propertiesError) {
        console.warn(`⚠️ Warning: Failed to recover properties for ${sellerNumber}:`, propertiesError.message);
      } else {
        console.log(`✅ Recovered ${propertiesRestored} properties for ${sellerNumber}`);
      }

      // 4. 監査ログを更新
      const recoveredAt = new Date().toISOString();
      const { error: auditUpdateError } = await this.supabase
        .from('seller_deletion_audit')
        .update({ 
          recovered_at: recoveredAt,
          recovered_by: recoveredBy,
        })
        .eq('id', auditLog.id);

      const auditRecordUpdated = !auditUpdateError;
      
      if (auditUpdateError) {
        console.warn(`⚠️ Warning: Failed to update audit log for ${sellerNumber}:`, auditUpdateError.message);
      }

      console.log(`🎉 Recovery completed for ${sellerNumber}`);

      return {
        success: true,
        sellerNumber,
        recoveredAt: new Date(recoveredAt),
        recoveredBy,
        details: {
          sellerRestored: true,
          propertiesRestored,
          auditRecordUpdated,
        },
      };

    } catch (error: any) {
      console.error(`❌ Recovery failed for ${sellerNumber}:`, error.message);
      return {
        success: false,
        sellerNumber,
        error: error.message,
      };
    }
  }


  /**
   * 不足している売主を同期
   */
  async syncMissingSellers(sellerNumbers: string[]): Promise<SyncResult> {
    const startTime = new Date();
    const errors: SyncError[] = [];
    let newSellersCount = 0;

    if (!this.isInitialized || !this.sheetsClient) {
      await this.initialize();
    }

    console.log(`🔄 Syncing ${sellerNumbers.length} missing sellers...`);

    // スプレッドシートから全データを取得（キャッシュ対応）
    const allRows = await this.getSpreadsheetData();
    const rowsBySellerNumber = new Map<string, any>();
    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (sellerNumber) {
        rowsBySellerNumber.set(String(sellerNumber), row);
      }
    }

    // 各売主を同期
    for (const sellerNumber of sellerNumbers) {
      const row = rowsBySellerNumber.get(sellerNumber);
      if (!row) {
        errors.push({
          sellerNumber,
          message: 'Row not found in spreadsheet',
          timestamp: new Date(),
        });
        continue;
      }

      try {
        await this.syncSingleSeller(sellerNumber, row);
        newSellersCount++;
        console.log(`✅ ${sellerNumber}: Created`);
      } catch (error: any) {
        errors.push({
          sellerNumber,
          message: error.message,
          timestamp: new Date(),
        });
        console.error(`❌ ${sellerNumber}: ${error.message}`);
      }
    }

    const endTime = new Date();
    const result: SyncResult = {
      success: errors.length === 0,
      startTime,
      endTime,
      newSellersCount,
      updatedSellersCount: 0,
      errors,
      missingSellersDetected: sellerNumbers.length,
      triggeredBy: 'scheduled',
    };

    console.log(`🎉 Sync completed: ${newSellersCount} new, ${errors.length} errors`);
    return result;
  }

  /**
   * 既存売主のデータを更新
   */
  async syncUpdatedSellers(sellerNumbers: string[]): Promise<SyncResult> {
    const startTime = new Date();
    const errors: SyncError[] = [];
    let updatedSellersCount = 0;

    if (!this.isInitialized || !this.sheetsClient) {
      await this.initialize();
    }

    console.log(`🔄 Updating ${sellerNumbers.length} existing sellers...`);

    // スプレッドシートから全データを取得（キャッシュ対応）
    const allRows = await this.getSpreadsheetData();
    const rowsBySellerNumber = new Map<string, any>();
    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (sellerNumber) {
        rowsBySellerNumber.set(String(sellerNumber), row);
      }
    }

    // 各売主を更新
    for (const sellerNumber of sellerNumbers) {
      const row = rowsBySellerNumber.get(sellerNumber);
      if (!row) {
        errors.push({
          sellerNumber,
          message: 'Row not found in spreadsheet',
          timestamp: new Date(),
        });
        continue;
      }

      try {
        await this.updateSingleSeller(sellerNumber, row);
        updatedSellersCount++;
        console.log(`✅ ${sellerNumber}: Updated`);
      } catch (error: any) {
        errors.push({
          sellerNumber,
          message: error.message,
          timestamp: new Date(),
        });
        console.error(`❌ ${sellerNumber}: ${error.message}`);
      }
    }

    const endTime = new Date();
    const result: SyncResult = {
      success: errors.length === 0,
      startTime,
      endTime,
      newSellersCount: 0,
      updatedSellersCount,
      errors,
      missingSellersDetected: 0,
      triggeredBy: 'scheduled',
    };

    console.log(`🎉 Update completed: ${updatedSellersCount} updated, ${errors.length} errors`);
    return result;
  }

  /**
   * 更新が必要な売主を検出
   * スプレッドシートとDBのデータを比較して、変更があった売主番号のリストを返す
   */
  async detectUpdatedSellers(): Promise<string[]> {
    if (!this.isInitialized || !this.sheetsClient) {
      await this.initialize();
    }

    console.log('🔍 Detecting updated sellers (comparing data)...');

    // スプレッドシートから全データを取得（キャッシュ対応）
    const allRows = await this.getSpreadsheetData();
    const sheetDataBySellerNumber = new Map<string, any>();
    
    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (sellerNumber && typeof sellerNumber === 'string' && sellerNumber.startsWith('AA')) {
        sheetDataBySellerNumber.set(sellerNumber, row);
      }
    }
    console.log(`📊 Spreadsheet sellers: ${sheetDataBySellerNumber.size}`);

    // DBから全売主データを取得（ページネーション対応）
    const updatedSellers: string[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    let totalChecked = 0;

    while (hasMore) {
      const { data: dbSellers, error } = await this.supabase
        .from('sellers')
        .select('seller_number, status, contract_year_month, visit_assignee, phone_contact_person, preferred_contact_time, contact_method, updated_at')
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Failed to fetch DB sellers: ${error.message}`);
      }

      if (!dbSellers || dbSellers.length === 0) {
        hasMore = false;
      } else {
        for (const dbSeller of dbSellers) {
          totalChecked++;
          const sellerNumber = dbSeller.seller_number;
          const sheetRow = sheetDataBySellerNumber.get(sellerNumber);
          
          if (!sheetRow) {
            // スプレッドシートにない = 削除された（別の処理で対応）
            continue;
          }

          // 重要なフィールドを比較
          const sheetContractYearMonth = sheetRow['契約年月 他決は分かった時点'];
          const sheetVisitAssignee = sheetRow['営担'];
          const sheetStatus = sheetRow['状況（当社）'];
          // コミュニケーションフィールドを追加
          const sheetPhoneContactPerson = sheetRow['電話担当（任意）'];
          const sheetPreferredContactTime = sheetRow['連絡取りやすい日、時間帯'];
          const sheetContactMethod = sheetRow['連絡方法'];

          // データが異なる場合は更新対象
          let needsUpdate = false;

          // contract_year_monthの比較
          if (sheetContractYearMonth && sheetContractYearMonth !== '') {
            const formattedDate = this.formatContractYearMonth(sheetContractYearMonth);
            // DBの値は YYYY-MM-DD 形式の文字列として比較
            const dbDate = dbSeller.contract_year_month ? String(dbSeller.contract_year_month).substring(0, 10) : null;
            if (formattedDate !== dbDate) {
              needsUpdate = true;
            }
          } else if (dbSeller.contract_year_month !== null) {
            needsUpdate = true;
          }

          // visit_assigneeの比較
          if (sheetVisitAssignee && sheetVisitAssignee !== dbSeller.visit_assignee) {
            needsUpdate = true;
          }

          // statusの比較
          if (sheetStatus && sheetStatus !== dbSeller.status) {
            needsUpdate = true;
          }

          // コミュニケーションフィールドの比較
          // phone_contact_personの比較
          const dbPhoneContact = dbSeller.phone_contact_person || '';
          const sheetPhoneContact = sheetPhoneContactPerson || '';
          if (sheetPhoneContact !== dbPhoneContact) {
            needsUpdate = true;
          }

          // preferred_contact_timeの比較
          const dbPreferredTime = dbSeller.preferred_contact_time || '';
          const sheetPreferredTime = sheetPreferredContactTime || '';
          if (sheetPreferredTime !== dbPreferredTime) {
            needsUpdate = true;
          }

          // contact_methodの比較
          const dbContactMethod = dbSeller.contact_method || '';
          const sheetContact = sheetContactMethod || '';
          if (sheetContact !== dbContactMethod) {
            needsUpdate = true;
          }

          if (needsUpdate) {
            updatedSellers.push(sellerNumber);
          }
        }

        offset += pageSize;
        if (dbSellers.length < pageSize) {
          hasMore = false;
        }
      }
    }

    console.log(`📊 Total sellers checked: ${totalChecked}`);
    console.log(`🔄 Updated sellers: ${updatedSellers.length}`);
    if (updatedSellers.length > 0) {
      console.log(`   First few: ${updatedSellers.slice(0, 5).join(', ')}${updatedSellers.length > 5 ? '...' : ''}`);
    }

    return updatedSellers;
  }

  /**
   * 契約年月を YYYY-MM-DD 形式にフォーマット（日は01固定）
   */
  private formatContractYearMonth(value: any): string | null {
    if (!value || value === '') return null;
    
    const str = String(value).trim();
    
    // YYYY/MM/DD 形式の場合
    if (str.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      const [year, month, day] = str.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // YYYY-MM-DD 形式の場合
    if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const [year, month, day] = str.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // YYYY/MM 形式の場合（日を01に設定）
    if (str.match(/^\d{4}\/\d{1,2}$/)) {
      const [year, month] = str.split('/');
      return `${year}-${month.padStart(2, '0')}-01`;
    }
    
    // YYYY-MM 形式の場合（日を01に設定）
    if (str.match(/^\d{4}-\d{1,2}$/)) {
      const [year, month] = str.split('-');
      return `${year}-${month.padStart(2, '0')}-01`;
    }
    
    return null;
  }

  /**
   * 反響日を YYYY-MM-DD 形式にフォーマット
   * 反響年と反響日（月/日）を組み合わせて完全な日付を作成
   */
  private formatInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
    if (!inquiryYear || !inquiryDate) return null;
    
    const year = this.parseNumeric(inquiryYear);
    if (year === null) return null;
    
    const dateStr = String(inquiryDate).trim();
    
    // MM/DD 形式の場合
    if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
      const [month, day] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // M/D 形式の場合
    if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
      const [month, day] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // YYYY/MM/DD 形式の場合（年が含まれている）
    if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      const [y, month, day] = dateStr.split('/');
      return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  }

  /**
   * 訪問日を YYYY-MM-DD 形式にフォーマット
   * YYYY/MM/DD または YYYY-MM-DD 形式の日付を標準化
   */
  private formatVisitDate(value: any): string | null {
    if (!value || value === '') return null;
    
    const str = String(value).trim();
    
    // YYYY/MM/DD 形式の場合
    if (str.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
      const [year, month, day] = str.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // YYYY-MM-DD 形式の場合
    if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const [year, month, day] = str.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // MM/DD 形式の場合（現在の年を使用）
    if (str.match(/^\d{1,2}\/\d{1,2}$/)) {
      const currentYear = new Date().getFullYear();
      const [month, day] = str.split('/');
      return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  }

  /**
   * 不通フラグをbooleanに変換
   * スプレッドシートの「不通」カラムの値:
   * - 空欄 → false
   * - 「通電OK」 → false
   * - その他の値（例: 「不通」） → true
   */
  private convertIsUnreachable(value: any): boolean {
    if (!value || value === '' || String(value).trim() === '' || String(value).trim() === '通電OK') {
      return false;
    }
    return true;
  }

  /**
   * 単一の売主を更新
   */
  private async updateSingleSeller(sellerNumber: string, row: any): Promise<void> {
    const mappedData = this.columnMapper.mapToDatabase(row);
    
    // 査定額を取得（手入力優先、なければ自動計算）
    // 🚨 重要: 種別（土地/戸建て/マンション）に関係なく、手動入力査定額を最優先で使用
    const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
    const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
    const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];

    // 反響関連フィールドを取得
    const inquiryYear = row['反響年'];
    const inquiryDate = row['反響日付'];  // 正しいカラム名: 反響日付
    const inquirySite = row['サイト'];

    // 訪問関連フィールドを取得（正しいカラム名を使用）
    const visitAcquisitionDate = row['訪問取得日\n年/月/日'];  // 改行文字を含む
    const visitDate = row['訪問日 Y/M/D'];
    const visitValuationAcquirer = row['訪問査定取得者'];
    const visitAssignee = row['営担'];

    // 物件関連フィールドを取得
    const propertyAddress = row['物件所在地'];
    let propertyType = row['種別'];
    if (propertyType) {
      const typeStr = String(propertyType).trim();
      const typeMapping: Record<string, string> = {
        '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
      };
      propertyType = typeMapping[typeStr] || typeStr;
    }
    const landArea = row['土（㎡）'];
    const buildingArea = row['建（㎡）'];
    const buildYear = row['築年'];
    const structure = row['構造'];
    const floorPlan = row['間取り'];

    const updateData: any = {
      name: mappedData.name ? encrypt(mappedData.name) : null,
      address: mappedData.address ? encrypt(mappedData.address) : null,
      phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
      email: mappedData.email ? encrypt(mappedData.email) : null,
      status: mappedData.status || '追客中',
      next_call_date: mappedData.next_call_date || null,
      pinrich_status: mappedData.pinrich_status || null,
      is_unreachable: this.convertIsUnreachable(row['不通']),
      updated_at: new Date().toISOString(),
    };

    // 物件関連フィールドを追加
    if (propertyAddress) {
      updateData.property_address = String(propertyAddress);
    }
    if (propertyType) {
      updateData.property_type = String(propertyType);
    }
    const parsedLandArea = this.parseNumeric(landArea);
    if (parsedLandArea !== null) {
      updateData.land_area = parsedLandArea;
    }
    const parsedBuildingArea = this.parseNumeric(buildingArea);
    if (parsedBuildingArea !== null) {
      updateData.building_area = parsedBuildingArea;
    }
    const parsedBuildYear = this.parseNumeric(buildYear);
    if (parsedBuildYear !== null) {
      updateData.build_year = parsedBuildYear;
    }
    if (structure) {
      updateData.structure = String(structure);
    }
    if (floorPlan) {
      updateData.floor_plan = String(floorPlan);
    }

    // 反響関連フィールドを追加
    if (inquiryYear) {
      updateData.inquiry_year = this.parseNumeric(inquiryYear);
    }
    if (inquiryDate) {
      updateData.inquiry_date = this.formatInquiryDate(inquiryYear, inquiryDate);
    }
    if (inquirySite) {
      updateData.inquiry_site = String(inquirySite);
    }

    // 訪問関連フィールドを追加
    if (visitAcquisitionDate) {
      updateData.visit_acquisition_date = this.formatVisitDate(visitAcquisitionDate);
    }
    if (visitDate) {
      updateData.visit_date = this.formatVisitDate(visitDate);
    }
    if (visitValuationAcquirer) {
      updateData.visit_valuation_acquirer = String(visitValuationAcquirer);
    }
    if (visitAssignee) {
      updateData.visit_assignee = String(visitAssignee);
    }

    // コミュニケーションフィールドを追加
    const phoneContactPerson = row['電話担当（任意）'];
    const preferredContactTime = row['連絡取りやすい日、時間帯'];
    const contactMethod = row['連絡方法'];
    
    if (phoneContactPerson) {
      updateData.phone_contact_person = String(phoneContactPerson);
    }
    if (preferredContactTime) {
      updateData.preferred_contact_time = String(preferredContactTime);
    }
    if (contactMethod) {
      updateData.contact_method = String(contactMethod);
    }

    // 査定方法を追加
    const valuationMethod = row['査定方法'];
    if (valuationMethod) {
      updateData.valuation_method = String(valuationMethod);
    }

    // I列「査定額」（テキスト形式）を追加
    // 例: "1900～2200万円", "2000万円前後"
    const valuationText = row['査定額'];
    if (valuationText) {
      updateData.valuation_text = String(valuationText);
    }

    // 契約年月を追加
    const contractYearMonth = row['契約年月 他決は分かった時点'];
    if (contractYearMonth && contractYearMonth !== '') {
      updateData.contract_year_month = this.formatContractYearMonth(contractYearMonth);
    }

    // 査定額を追加（万円→円に変換）
    const val1 = this.parseNumeric(valuation1);
    const val2 = this.parseNumeric(valuation2);
    const val3 = this.parseNumeric(valuation3);
    if (val1 !== null) updateData.valuation_amount_1 = val1 * 10000;
    if (val2 !== null) updateData.valuation_amount_2 = val2 * 10000;
    if (val3 !== null) updateData.valuation_amount_3 = val3 * 10000;

    const { error: updateError } = await this.supabase
      .from('sellers')
      .update(updateData)
      .eq('seller_number', sellerNumber);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // 物件情報も更新
    const { data: seller } = await this.supabase
      .from('sellers')
      .select('id')
      .eq('seller_number', sellerNumber)
      .single();

    if (seller) {
      const propertyAddress = row['物件所在地'] || '未入力';
      let propertyType = row['種別'];
      if (propertyType) {
        const typeStr = String(propertyType).trim();
        const typeMapping: Record<string, string> = {
          '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
        };
        propertyType = typeMapping[typeStr] || typeStr;
      }

      await this.propertySyncHandler.syncProperty(seller.id, {
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
  }

  /**
   * 単一の売主を同期
   */
  private async syncSingleSeller(sellerNumber: string, row: any): Promise<void> {
    const mappedData = this.columnMapper.mapToDatabase(row);
    
    // 査定額を取得（手入力優先、なければ自動計算）
    // 🚨 重要: 種別（土地/戸建て/マンション）に関係なく、手動入力査定額を最優先で使用
    const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
    const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
    const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];

    // 反響関連フィールドを取得
    const inquiryYear = row['反響年'];
    const inquiryDate = row['反響日付'];  // 正しいカラム名: 反響日付
    const inquirySite = row['サイト'];

    // 訪問関連フィールドを取得（正しいカラム名を使用）
    const visitAcquisitionDate = row['訪問取得日\n年/月/日'];  // 改行文字を含む
    const visitDate = row['訪問日 Y/M/D'];
    const visitValuationAcquirer = row['訪問査定取得者'];
    const visitAssignee = row['営担'];

    // 物件関連フィールドを取得
    const propertyAddress = row['物件所在地'];
    let propertyType = row['種別'];
    if (propertyType) {
      const typeStr = String(propertyType).trim();
      const typeMapping: Record<string, string> = {
        '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
      };
      propertyType = typeMapping[typeStr] || typeStr;
    }
    const landArea = row['土（㎡）'];
    const buildingArea = row['建（㎡）'];
    const buildYear = row['築年'];
    const structure = row['構造'];
    const floorPlan = row['間取り'];

    const encryptedData: any = {
      seller_number: sellerNumber,
      name: mappedData.name ? encrypt(mappedData.name) : null,
      address: mappedData.address ? encrypt(mappedData.address) : null,
      phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
      email: mappedData.email ? encrypt(mappedData.email) : null,
      status: mappedData.status || '追客中',
      next_call_date: mappedData.next_call_date || null,
      pinrich_status: mappedData.pinrich_status || null,
      is_unreachable: this.convertIsUnreachable(row['不通']),
    };

    // 物件関連フィールドを追加
    if (propertyAddress) {
      encryptedData.property_address = String(propertyAddress);
    }
    if (propertyType) {
      encryptedData.property_type = String(propertyType);
    }
    const parsedLandArea = this.parseNumeric(landArea);
    if (parsedLandArea !== null) {
      encryptedData.land_area = parsedLandArea;
    }
    const parsedBuildingArea = this.parseNumeric(buildingArea);
    if (parsedBuildingArea !== null) {
      encryptedData.building_area = parsedBuildingArea;
    }
    const parsedBuildYear = this.parseNumeric(buildYear);
    if (parsedBuildYear !== null) {
      encryptedData.build_year = parsedBuildYear;
    }
    if (structure) {
      encryptedData.structure = String(structure);
    }
    if (floorPlan) {
      encryptedData.floor_plan = String(floorPlan);
    }

    // 反響関連フィールドを追加
    if (inquiryYear) {
      encryptedData.inquiry_year = this.parseNumeric(inquiryYear);
    }
    if (inquiryDate) {
      encryptedData.inquiry_date = this.formatInquiryDate(inquiryYear, inquiryDate);
    }
    if (inquirySite) {
      encryptedData.inquiry_site = String(inquirySite);
    }

    // 訪問関連フィールドを追加
    if (visitAcquisitionDate) {
      encryptedData.visit_acquisition_date = this.formatVisitDate(visitAcquisitionDate);
    }
    if (visitDate) {
      encryptedData.visit_date = this.formatVisitDate(visitDate);
    }
    if (visitValuationAcquirer) {
      encryptedData.visit_valuation_acquirer = String(visitValuationAcquirer);
    }
    if (visitAssignee) {
      encryptedData.visit_assignee = String(visitAssignee);
    }

    // コミュニケーションフィールドを追加
    const phoneContactPerson = row['電話担当（任意）'];
    const preferredContactTime = row['連絡取りやすい日、時間帯'];
    const contactMethod = row['連絡方法'];
    
    if (phoneContactPerson) {
      encryptedData.phone_contact_person = String(phoneContactPerson);
    }
    if (preferredContactTime) {
      encryptedData.preferred_contact_time = String(preferredContactTime);
    }
    if (contactMethod) {
      encryptedData.contact_method = String(contactMethod);
    }

    // 査定方法を追加
    const valuationMethod = row['査定方法'];
    if (valuationMethod) {
      encryptedData.valuation_method = String(valuationMethod);
    }

    // I列「査定額」（テキスト形式）を追加
    // 例: "1900～2200万円", "2000万円前後"
    const valuationText = row['査定額'];
    if (valuationText) {
      encryptedData.valuation_text = String(valuationText);
    }

    // 契約年月を追加
    const contractYearMonth = row['契約年月 他決は分かった時点'];
    if (contractYearMonth && contractYearMonth !== '') {
      encryptedData.contract_year_month = this.formatContractYearMonth(contractYearMonth);
    }

    // 査定額を追加（万円→円に変換）
    const val1 = this.parseNumeric(valuation1);
    const val2 = this.parseNumeric(valuation2);
    const val3 = this.parseNumeric(valuation3);
    if (val1 !== null) encryptedData.valuation_amount_1 = val1 * 10000;
    if (val2 !== null) encryptedData.valuation_amount_2 = val2 * 10000;
    if (val3 !== null) encryptedData.valuation_amount_3 = val3 * 10000;

    // UPSERT: 既存データがあれば更新、なければ挿入
    const { data: newSeller, error: upsertError } = await this.supabase
      .from('sellers')
      .upsert(encryptedData, {
        onConflict: 'seller_number', // seller_number が重複した場合は更新
        ignoreDuplicates: false, // 重複時に更新を実行
      })
      .select()
      .single();

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    // 物件情報を確実に作成
    if (newSeller) {
      try {
        await this.ensurePropertyCreated(newSeller.id, sellerNumber, row);
      } catch (error: any) {
        console.error(`❌ Failed to create property for ${sellerNumber}:`, error.message);
        // 物件作成失敗をログに記録
        await this.logPropertyCreationError(sellerNumber, error.message);
        // 物件作成失敗は警告のみ（売主は既に作成済み）
        // エラーを再スローしない（売主同期は成功とみなす）
      }
    }
  }

  /**
   * 物件情報を確実に作成
   * 
   * @param sellerId - 売主ID
   * @param sellerNumber - 売主番号
   * @param row - スプレッドシートの行データ
   */
  private async ensurePropertyCreated(
    sellerId: string,
    sellerNumber: string,
    row: any
  ): Promise<void> {
    const propertyAddress = row['物件所在地'] || '未入力';
    const propertyNumber = row['物件番号'] ? String(row['物件番号']) : undefined;
    
    let propertyType = row['種別'];
    if (propertyType) {
      const typeStr = String(propertyType).trim();
      const typeMapping: Record<string, string> = {
        '土': '土地',
        '戸': '戸建て',
        'マ': 'マンション',
        '事': '事業用',
      };
      propertyType = typeMapping[typeStr] || 'その他';
    } else {
      propertyType = 'その他';
    }

    const propertyData = {
      address: String(propertyAddress),
      property_type: propertyType ? String(propertyType) : undefined,
      land_area: this.parseNumeric(row['土（㎡）']) ?? undefined,
      building_area: this.parseNumeric(row['建（㎡）']) ?? undefined,
      build_year: this.parseNumeric(row['築年']) ?? undefined,
      structure: row['構造'] ? String(row['構造']) : undefined,
      seller_situation: row['状況（売主）'] ? String(row['状況（売主）']) : undefined,
      floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
    };

    const result = await this.propertySyncHandler.syncProperty(
      sellerId,
      propertyData,
      propertyNumber
    );

    if (!result.success) {
      throw new Error(`Property sync failed: ${result.error}`);
    }

    console.log(`✅ ${sellerNumber}: Property created/updated${propertyNumber ? ` (${propertyNumber})` : ''}`);
  }

  /**
   * 物件作成エラーをログに記録
   * 
   * @param sellerNumber - 売主番号
   * @param errorMessage - エラーメッセージ
   */
  private async logPropertyCreationError(
    sellerNumber: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('sync_logs')
        .insert({
          entity_type: 'property',
          entity_id: sellerNumber,
          operation: 'create',
          status: 'failed',
          error_message: errorMessage,
          timestamp: new Date().toISOString(),
        });
      
      console.log(`📝 Logged property creation error for ${sellerNumber}`);
    } catch (error: any) {
      console.error(`⚠️  Failed to log error for ${sellerNumber}:`, error.message);
      // ログ記録失敗は無視（メイン処理に影響させない）
    }
  }


  /**
   * 物件リスト更新同期を実行
   * PropertyListingSyncService.syncUpdatedPropertyListings()を呼び出し
   */
  async syncPropertyListingUpdates(): Promise<{
    success: boolean;
    updated: number;
    failed: number;
    duration_ms: number;
    errors?: Array<{ property_number: string; error: string }>;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('🏢 Starting property listing update sync...');
      
      // PropertyListingSyncServiceを初期化
      const { PropertyListingSyncService } = await import('./PropertyListingSyncService');
      const { GoogleSheetsClient } = await import('./GoogleSheetsClient');
      
      // 物件リストスプレッドシート設定
      const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
      const PROPERTY_LIST_SHEET_NAME = '物件';
      
      const sheetsConfig = {
        spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
        sheetName: PROPERTY_LIST_SHEET_NAME,
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      };
      
      const sheetsClient = new GoogleSheetsClient(sheetsConfig);
      await sheetsClient.authenticate();
      
      const syncService = new PropertyListingSyncService(sheetsClient);
      
      // 更新同期を実行
      const result = await syncService.syncUpdatedPropertyListings();
      
      const duration_ms = Date.now() - startTime;
      
      console.log(`✅ Property listing update sync completed: ${result.updated} updated, ${result.failed} failed`);
      
      return {
        success: result.failed === 0,
        updated: result.updated,
        failed: result.failed,
        duration_ms,
        errors: result.errors,
      };
      
    } catch (error: any) {
      const duration_ms = Date.now() - startTime;
      console.error('❌ Property listing update sync failed:', error.message);
      
      return {
        success: false,
        updated: 0,
        failed: 1,
        duration_ms,
        errors: [{
          property_number: 'SYSTEM',
          error: error.message,
        }],
      };
    }
  }

  /**
   * Phase 4.6: 新規物件追加同期を実行
   * PropertyListingSyncService.syncNewProperties()を呼び出し
   */
  async syncNewPropertyAddition(): Promise<{
    success: boolean;
    added: number;
    failed: number;
    duration_ms: number;
  }> {
    const startTime = Date.now();

    try {
      console.log('🆕 Starting new property addition sync...');

      // PropertyListingSyncServiceを初期化
      const { PropertyListingSyncService } = await import('./PropertyListingSyncService');
      const { GoogleSheetsClient } = await import('./GoogleSheetsClient');

      const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
      const PROPERTY_LIST_SHEET_NAME = '物件';

      const sheetsConfig = {
        spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
        sheetName: PROPERTY_LIST_SHEET_NAME,
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      };

      const sheetsClient = new GoogleSheetsClient(sheetsConfig);
      await sheetsClient.authenticate();

      const syncService = new PropertyListingSyncService(sheetsClient);

      // 新規物件追加同期を実行
      const result = await syncService.syncNewProperties();

      const duration_ms = Date.now() - startTime;

      console.log(`✅ New property addition sync completed: ${result.added} added, ${result.failed} failed`);

      return {
        success: result.failed === 0,
        added: result.added,
        failed: result.failed,
        duration_ms
      };

    } catch (error: any) {
      const duration_ms = Date.now() - startTime;
      console.error('❌ New property addition sync failed:', error.message);

      return {
        success: false,
        added: 0,
        failed: 1,
        duration_ms
      };
    }
  }

  /**
   * Phase 4.7: property_details同期を実行
   * property_listingsに存在するがproperty_detailsに存在しない物件を検出して同期
   */
  async syncMissingPropertyDetails(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    duration_ms: number;
  }> {
    const startTime = Date.now();

    try {
      console.log('📝 Starting property details sync...');

      // 1. property_listingsから全物件番号を取得
      const propertyListingsNumbers = new Set<string>();
      const pageSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: properties, error } = await this.supabase
          .from('property_listings')
          .select('property_number')
          .range(offset, offset + pageSize - 1);

        if (error) {
          throw new Error(`Failed to read property_listings: ${error.message}`);
        }

        if (!properties || properties.length === 0) {
          hasMore = false;
        } else {
          for (const property of properties) {
            if (property.property_number) {
              propertyListingsNumbers.add(property.property_number);
            }
          }
          offset += pageSize;
          
          if (properties.length < pageSize) {
            hasMore = false;
          }
        }
      }

      console.log(`📊 Total properties in property_listings: ${propertyListingsNumbers.size}`);

      // 2. property_detailsから全物件番号を取得（コメントデータが空かどうかも確認）
      const propertyDetailsNumbers = new Set<string>();
      const emptyCommentsPropertyNumbers = new Set<string>(); // コメントデータが空の物件
      offset = 0;
      hasMore = true;

      while (hasMore) {
        const { data: details, error } = await this.supabase
          .from('property_details')
          .select('property_number, recommended_comments')
          .range(offset, offset + pageSize - 1);

        if (error) {
          throw new Error(`Failed to read property_details: ${error.message}`);
        }

        if (!details || details.length === 0) {
          hasMore = false;
        } else {
          for (const detail of details) {
            if (detail.property_number) {
              propertyDetailsNumbers.add(detail.property_number);
              
              // recommended_commentsが空または未設定の場合、更新対象に追加
              const hasComments = detail.recommended_comments && 
                                  Array.isArray(detail.recommended_comments) && 
                                  detail.recommended_comments.length > 0;
              if (!hasComments) {
                emptyCommentsPropertyNumbers.add(detail.property_number);
              }
            }
          }
          offset += pageSize;
          
          if (details.length < pageSize) {
            hasMore = false;
          }
        }
      }

      console.log(`📊 Total properties in property_details: ${propertyDetailsNumbers.size}`);
      console.log(`📊 Properties with empty comments: ${emptyCommentsPropertyNumbers.size}`);

      // 3. 差分を計算（property_listingsにあってproperty_detailsにないもの + コメントが空のもの）
      const missingPropertyNumbers: string[] = [];
      for (const propertyNumber of propertyListingsNumbers) {
        // property_detailsに存在しない、またはコメントデータが空の場合は同期対象
        if (!propertyDetailsNumbers.has(propertyNumber) || emptyCommentsPropertyNumbers.has(propertyNumber)) {
          missingPropertyNumbers.push(propertyNumber);
        }
      }

      console.log(`🆕 Properties to sync (missing or empty comments): ${missingPropertyNumbers.length}`);

      if (missingPropertyNumbers.length === 0) {
        const duration_ms = Date.now() - startTime;
        return {
          success: true,
          synced: 0,
          failed: 0,
          duration_ms
        };
      }

      // 4. PropertyListingSyncServiceを使用して同期
      const { PropertyListingSyncService } = await import('./PropertyListingSyncService');
      const syncService = new PropertyListingSyncService();

      let synced = 0;
      let failed = 0;

      // バッチ処理（10件ずつ）
      const BATCH_SIZE = 10;
      for (let i = 0; i < missingPropertyNumbers.length; i += BATCH_SIZE) {
        const batch = missingPropertyNumbers.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(missingPropertyNumbers.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} properties)...`);

        for (const propertyNumber of batch) {
          try {
            // 物件情報を取得（物件種別が必要）
            const { data: property, error: propertyError } = await this.supabase
              .from('property_listings')
              .select('property_type')
              .eq('property_number', propertyNumber)
              .single();

            if (propertyError || !property) {
              console.error(`❌ ${propertyNumber}: Property not found in property_listings`);
              failed++;
              continue;
            }

            // AthomeSheetSyncServiceを使用してスプレッドシートからコメントデータを取得
            const { AthomeSheetSyncService } = await import('./AthomeSheetSyncService');
            const athomeSheetSyncService = new AthomeSheetSyncService();
            
            const syncSuccess = await athomeSheetSyncService.syncPropertyComments(
              propertyNumber,
              property.property_type as 'land' | 'detached_house' | 'apartment'
            );

            // PropertyServiceを使用して物件リストスプレッドシートのBQ列（●内覧前伝達事項）からproperty_aboutを取得
            const { PropertyService } = await import('./PropertyService');
            const propertyService = new PropertyService();
            
            try {
              const propertyAbout = await propertyService.getPropertyAbout(propertyNumber);
              
              if (propertyAbout) {
                // property_detailsテーブルにproperty_aboutを保存
                const { error: updateError } = await this.supabase
                  .from('property_details')
                  .update({ property_about: propertyAbout })
                  .eq('property_number', propertyNumber);
                
                if (updateError) {
                  console.warn(`⚠️ ${propertyNumber}: Failed to update property_about: ${updateError.message}`);
                } else {
                  console.log(`✅ ${propertyNumber}: Synced property_about from BQ column`);
                }
              }
            } catch (aboutError: any) {
              console.warn(`⚠️ ${propertyNumber}: Failed to get property_about: ${aboutError.message}`);
            }

            if (syncSuccess) {
              console.log(`✅ ${propertyNumber}: Synced comments from spreadsheet`);
              synced++;
            } else {
              console.error(`❌ ${propertyNumber}: Failed to sync comments from spreadsheet`);
              failed++;
            }
          } catch (error: any) {
            console.error(`❌ ${propertyNumber}: ${error.message}`);
            failed++;
          }
        }

        // バッチ間に少し待機
        if (i + BATCH_SIZE < missingPropertyNumbers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const duration_ms = Date.now() - startTime;

      console.log(`✅ Property details sync completed: ${synced} synced, ${failed} failed`);

      return {
        success: failed === 0,
        synced,
        failed,
        duration_ms
      };

    } catch (error: any) {
      const duration_ms = Date.now() - startTime;
      console.error('❌ Property details sync failed:', error.message);

      return {
        success: false,
        synced: 0,
        failed: 1,
        duration_ms
      };
    }
  }

  /**
   * フル同期を実行
   * detectMissingSellersとsyncMissingSellersを組み合わせて実行
   * 更新同期と削除同期も含む
   */
  async runFullSync(triggeredBy: 'scheduled' | 'manual' = 'scheduled', clearCache: boolean = false): Promise<CompleteSyncResult> {
    const startTime = new Date();
    console.log(`🔄 Starting full sync (triggered by: ${triggeredBy})`);
    
    // 手動トリガーまたは明示的にキャッシュクリアが指定された場合、キャッシュをクリア
    if (clearCache || triggeredBy === 'manual') {
      this.clearSpreadsheetCache();
    }
    
    try {
      // Phase 1: 追加同期 - 不足売主を検出して追加（最優先）
      // 環境変数チェック：売主同期を有効にするか
      const isSellerSyncEnabled = process.env.SELLER_SYNC_ENABLED !== 'false';
      console.log('🔍 SELLER_SYNC_ENABLED:', process.env.SELLER_SYNC_ENABLED);
      console.log('🔍 isSellerSyncEnabled:', isSellerSyncEnabled);

      if (isSellerSyncEnabled) {


      console.log('📥 Phase 1: Seller Addition Sync');

      const missingSellers = await this.detectMissingSellers();
      
      let additionResult = {
        totalProcessed: 0,
        successfullyAdded: 0,
        successfullyUpdated: 0,
        failed: 0,
      };

      if (missingSellers.length > 0) {
        const syncResult = await this.syncMissingSellers(missingSellers);
        additionResult = {
          totalProcessed: missingSellers.length,
          successfullyAdded: syncResult.newSellersCount,
          successfullyUpdated: 0,
          failed: syncResult.errors.length,
        };
      } else {
        console.log('✅ No missing sellers to sync');
      }

      // Phase 2: 更新同期 - 既存売主のデータを更新
      console.log('\n🔄 Phase 2: Seller Update Sync');
      const updatedSellers = await this.detectUpdatedSellers();
      
      if (updatedSellers.length > 0) {
        const updateResult = await this.syncUpdatedSellers(updatedSellers);
        additionResult.totalProcessed += updatedSellers.length;
        additionResult.successfullyUpdated = updateResult.updatedSellersCount;
        additionResult.failed += updateResult.errors.length;
      } else {
        console.log('✅ No sellers to update');
      }

      // Phase 3: 削除同期 - 削除された売主を検出してソフトデリート
      let deletionResult: DeletionSyncResult = {
        totalDetected: 0,
        successfullyDeleted: 0,
        failedToDelete: 0,
        requiresManualReview: 0,
        deletedSellerNumbers: [],
        manualReviewSellerNumbers: [],
        errors: [],
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
      };

      if (this.isDeletionSyncEnabled()) {
        console.log('\n🗑️  Phase 3: Seller Deletion Sync');
        const deletedSellers = await this.detectDeletedSellers();
        
        if (deletedSellers.length > 0) {
          deletionResult = await this.syncDeletedSellers(deletedSellers);
        } else {
          console.log('✅ No deleted sellers to sync');
        }
      } else {
        console.log('\n⏭️  Phase 3: Seller Deletion Sync (Disabled)');
      }
      } else {
        console.log('\n⏭️  Phase 1-3: Seller Sync (Disabled by SELLER_SYNC_ENABLED=false)');
      }


      // Phase 4: 作業タスク同期（既存）
      console.log('\n📋 Phase 4: Work Task Sync');
      // Note: Work task sync is handled elsewhere
      console.log('✅ Work task sync (handled by existing service)');

      // Phase 4.5: 物件リスト更新同期（新規追加）
      console.log('\n🏢 Phase 4.5: Property Listing Update Sync');
      let propertyListingUpdateResult = {
        updated: 0,
        failed: 0,
        duration_ms: 0,
      };
      
      try {
        const plResult = await this.syncPropertyListingUpdates();
        propertyListingUpdateResult = {
          updated: plResult.updated,
          failed: plResult.failed,
          duration_ms: plResult.duration_ms,
        };
        
        if (plResult.updated > 0) {
          console.log(`✅ Property listing update sync: ${plResult.updated} updated`);
        } else {
          console.log('✅ No property listings to update');
        }
      } catch (error: any) {
        console.error('⚠️  Property listing update sync error:', error.message);
        propertyListingUpdateResult.failed = 1;
        // エラーでも次のフェーズに進む
      }

      // Phase 4.6: 新規物件追加同期（新規追加）
      console.log('\n🆕 Phase 4.6: New Property Addition Sync');
      let newPropertyAdditionResult = {
        added: 0,
        failed: 0,
        duration_ms: 0,
      };
      
      try {
        const newPropResult = await this.syncNewPropertyAddition();
        newPropertyAdditionResult = {
          added: newPropResult.added,
          failed: newPropResult.failed,
          duration_ms: newPropResult.duration_ms,
        };
        
        if (newPropResult.added > 0) {
          console.log(`✅ New property addition sync: ${newPropResult.added} added`);
        } else {
          console.log('✅ No new properties to add');
        }
      } catch (error: any) {
        console.error('⚠️  New property addition sync error:', error.message);
        newPropertyAdditionResult.failed = 1;
        // エラーでも処理を継続
      }

      // Phase 4.7: property_details同期（新規追加）
      console.log('\n📝 Phase 4.7: Property Details Sync');
      let propertyDetailsSyncResult = {
        synced: 0,
        failed: 0,
        duration_ms: 0,
      };
      
      try {
        const pdResult = await this.syncMissingPropertyDetails();
        propertyDetailsSyncResult = {
          synced: pdResult.synced,
          failed: pdResult.failed,
          duration_ms: pdResult.duration_ms,
        };
        
        if (pdResult.synced > 0) {
          console.log(`✅ Property details sync: ${pdResult.synced} synced`);
        } else {
          console.log('✅ No missing property details to sync');
        }
      } catch (error: any) {
        console.error('⚠️  Property details sync error:', error.message);
        propertyDetailsSyncResult.failed = 1;
        // エラーでも処理を継続
      }

      const endTime = new Date();
      const totalDurationMs = endTime.getTime() - startTime.getTime();

      // 全体のステータスを判定
      let status: 'success' | 'partial_success' | 'failed' = 'success';
      if (additionResult.failed > 0 || 
          deletionResult.failedToDelete > 0 || 
          propertyListingUpdateResult.failed > 0 ||
          newPropertyAdditionResult.failed > 0) {
        status = 'partial_success';
      }
      if (additionResult.successfullyAdded === 0 && 
          additionResult.successfullyUpdated === 0 && 
          deletionResult.successfullyDeleted === 0 &&
          propertyListingUpdateResult.updated === 0 &&
          newPropertyAdditionResult.added === 0 &&
          (additionResult.failed > 0 || 
           deletionResult.failedToDelete > 0 || 
           propertyListingUpdateResult.failed > 0 ||
           newPropertyAdditionResult.failed > 0)) {
        status = 'failed';
      }

      const completeResult: CompleteSyncResult = {
        additionResult,
        deletionResult,
        status,
        syncedAt: endTime,
        totalDurationMs,
      };

      console.log('\n📊 Complete Sync Summary:');
      console.log(`   Status: ${status}`);
      console.log(`   Sellers Added: ${additionResult.successfullyAdded}`);
      console.log(`   Sellers Updated: ${additionResult.successfullyUpdated}`);
      console.log(`   Sellers Deleted: ${deletionResult.successfullyDeleted}`);
      console.log(`   Property Listings Updated: ${propertyListingUpdateResult.updated}`);
      console.log(`   New Properties Added: ${newPropertyAdditionResult.added}`);
      console.log(`   Property Details Synced: ${propertyDetailsSyncResult.synced}`);
      console.log(`   Manual Review: ${deletionResult.requiresManualReview}`);
      console.log(`   Duration: ${(totalDurationMs / 1000).toFixed(2)}s`);

      // Note: Logging removed - sync_logs table not needed
      // EnhancedAutoSyncService works without database logging

      return completeResult;
    } catch (error: any) {
      console.error('❌ Full sync failed:', error.message);
      
      const endTime = new Date();
      return {
        additionResult: {
          totalProcessed: 0,
          successfullyAdded: 0,
          successfullyUpdated: 0,
          failed: 1,
        },
        deletionResult: {
          totalDetected: 0,
          successfullyDeleted: 0,
          failedToDelete: 0,
          requiresManualReview: 0,
          deletedSellerNumbers: [],
          manualReviewSellerNumbers: [],
          errors: [{
            sellerNumber: 'SYSTEM',
            error: error.message,
          }],
          startedAt: new Date(),
          completedAt: new Date(),
          durationMs: 0,
        },
        status: 'failed',
        syncedAt: endTime,
        totalDurationMs: endTime.getTime() - startTime.getTime(),
      };
    }
  }
}

// シングルトンインスタンス
let enhancedAutoSyncServiceInstance: EnhancedAutoSyncService | null = null;

export function getEnhancedAutoSyncService(): EnhancedAutoSyncService {
  if (!enhancedAutoSyncServiceInstance) {
    enhancedAutoSyncServiceInstance = new EnhancedAutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return enhancedAutoSyncServiceInstance;
}


/**
 * 強化版定期同期マネージャー
 * 指定間隔でスプレッドシートからDBへの同期を実行します
 * デフォルトで有効化され、エラー時も継続します
 */
export class EnhancedPeriodicSyncManager {
  private intervalId: NodeJS.Timeout | null = null;
  private syncService: EnhancedAutoSyncService;
  private intervalMinutes: number;
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  constructor(intervalMinutes: number = 10) {
    this.syncService = getEnhancedAutoSyncService();
    this.intervalMinutes = intervalMinutes;
  }

  /**
   * 定期同期を開始
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Enhanced periodic sync is already running');
      return;
    }

    try {
      await this.syncService.initialize();
      this.isRunning = true;

      // 初回実行を60秒後に遅延（クォータ制限対策）
      console.log(`🔄 Starting enhanced periodic sync (interval: ${this.intervalMinutes} minutes)`);
      console.log('⏰ First sync will run in 60 seconds (quota limit protection)');
      
      setTimeout(async () => {
        await this.runSync();
        
        // 定期実行を設定
        this.intervalId = setInterval(async () => {
          await this.runSync();
        }, this.intervalMinutes * 60 * 1000);
        
        console.log(`✅ Enhanced periodic sync started (every ${this.intervalMinutes} minutes)`);
      }, 60 * 1000); // 60秒後に初回実行

    } catch (error: any) {
      console.error('❌ Failed to start enhanced periodic sync:', error.message);
      // エラーでも再試行のためにisRunningはtrueのまま
      this.scheduleRetry();
    }
  }

  /**
   * 初期化失敗時のリトライをスケジュール
   */
  private scheduleRetry(): void {
    console.log('🔄 Scheduling retry in 1 minute...');
    setTimeout(async () => {
      if (!this.isRunning) return;
      try {
        await this.syncService.initialize();
        await this.runSync();
        
        // 成功したら定期実行を開始
        this.intervalId = setInterval(async () => {
          await this.runSync();
        }, this.intervalMinutes * 60 * 1000);
        
        console.log(`✅ Enhanced periodic sync recovered`);
      } catch (error: any) {
        console.error('❌ Retry failed:', error.message);
        this.scheduleRetry();
      }
    }, 60 * 1000);
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
    console.log('🛑 Enhanced periodic sync stopped');
  }

  /**
   * 同期を実行
   */
  private async runSync(): Promise<void> {
    try {
      const { getSyncHealthChecker } = await import('./SyncHealthChecker');
      
      const result = await this.syncService.runFullSync('scheduled');
      this.lastSyncTime = new Date();
      
      // ログ記録は runFullSync 内で既に実行されている
      
      // ヘルスチェックを更新
      const healthChecker = getSyncHealthChecker();
      await healthChecker.checkAndUpdateHealth();
      
      const totalChanges = result.additionResult.successfullyAdded + 
                          result.additionResult.successfullyUpdated +
                          result.deletionResult.successfullyDeleted;
      
      if (totalChanges > 0) {
        console.log(`📊 Enhanced periodic sync: ${result.additionResult.successfullyAdded} added, ${result.additionResult.successfullyUpdated} updated, ${result.deletionResult.successfullyDeleted} deleted`);
      }
    } catch (error: any) {
      console.error('⚠️ Enhanced periodic sync error:', error.message);
      // エラーでも次回スケジュールは継続
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

  /**
   * 最後の同期時刻を取得
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}

// 強化版定期同期マネージャーのシングルトン
let enhancedPeriodicSyncManagerInstance: EnhancedPeriodicSyncManager | null = null;

export function getEnhancedPeriodicSyncManager(intervalMinutes?: number): EnhancedPeriodicSyncManager {
  if (!enhancedPeriodicSyncManagerInstance) {
    enhancedPeriodicSyncManagerInstance = new EnhancedPeriodicSyncManager(
      intervalMinutes || parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '5', 10)
    );
  }
  return enhancedPeriodicSyncManagerInstance;
}

/**
 * 自動同期が有効かどうかを判定
 * デフォルトで有効、明示的にfalseの場合のみ無効
 */
export function isAutoSyncEnabled(): boolean {
  const envValue = process.env.AUTO_SYNC_ENABLED;
  // 明示的に'false'の場合のみ無効
  if (envValue === 'false') {
    return false;
  }
  // それ以外（未設定、'true'、その他）は有効
  return true;
}
