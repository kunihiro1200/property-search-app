// 買主リストの同期サービス
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import { BuyerColumnMapper } from './BuyerColumnMapper';
import { BuyerSyncLogger } from './BuyerSyncLogger';
import { SyncMonitoringService, FieldSyncResult } from './SyncMonitoringService';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';
const BATCH_SIZE = 50; // Reduced from 100 for better progress reporting

export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: SyncError[];
  duration: number;
  totalProcessed: number;
  successRate: number;
}

export interface SyncError {
  row: number;
  buyerNumber: string | null;
  message: string;
  timestamp: string;
  errorType?: SyncErrorType;
}

export enum SyncErrorType {
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  VALIDATION_ERROR = 'validation_error',
  SCHEMA_ERROR = 'schema_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining: number;
}

export class BuyerSyncService {
  private supabase;
  private columnMapper: BuyerColumnMapper;
  private syncLogger: BuyerSyncLogger;
  private syncMonitoring: SyncMonitoringService;
  private isSyncing: boolean = false;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.columnMapper = new BuyerColumnMapper();
    this.syncLogger = new BuyerSyncLogger();
    this.syncMonitoring = new SyncMonitoringService();
  }

  /**
   * 同期中かどうかを確認
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * 全データを同期
   */
  async syncAll(): Promise<SyncResult> {
    return this.syncAllWithProgress();
  }

  /**
   * 全データを同期（進捗レポート付き）
   */
  async syncAllWithProgress(
    progressCallback?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync is already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const result: SyncResult = {
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      duration: 0,
      totalProcessed: 0,
      successRate: 0
    };

    let syncLogId: string | null = null;

    try {
      console.log('Starting buyers sync...');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, '../../google-service-account.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // ヘッダー取得
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!1:1`,
      });
      const headers = headerResponse.data.values?.[0] || [];
      console.log(`Found ${headers.length} columns`);

      // データ取得（181カラム対応）
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A2:GZ`,
      });
      const rows = dataResponse.data.values || [];
      console.log(`Found ${rows.length} rows to sync`);

      // Log sync start
      syncLogId = await this.syncLogger.logSyncStart(rows.length);

      // バッチ処理
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, rows.length);
        const batch = rows.slice(start, end);
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (rows ${start + 2} to ${end + 1})`);
        
        const batchResult = await this.processBatch(headers, batch, start + 2);
        
        result.created += batchResult.created;
        result.updated += batchResult.updated;
        result.failed += batchResult.failed;
        result.skipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
        result.totalProcessed = end;

        // Report progress
        if (progressCallback) {
          this.reportProgress(end, rows.length, startTime, progressCallback);
        }
      }

      result.duration = Date.now() - startTime;
      result.successRate = this.calculateSuccessRate(result);
      
      console.log(`Sync complete in ${result.duration}ms: ${result.created} created, ${result.updated} updated, ${result.failed} failed, ${result.skipped} skipped`);
      console.log(`Success rate: ${result.successRate.toFixed(2)}%`);

      // Log sync complete
      if (syncLogId) {
        await this.syncLogger.logSyncComplete(syncLogId, result);
      }
      
      return result;
    } catch (error) {
      // Log sync failure
      if (syncLogId) {
        result.duration = Date.now() - startTime;
        result.successRate = this.calculateSuccessRate(result);
        await this.syncLogger.logSyncComplete(syncLogId, result);
      }
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }


  /**
   * バッチを処理
   */
  private async processBatch(
    headers: string[],
    rows: any[][],
    startRowNumber: number
  ): Promise<{ created: number; updated: number; failed: number; skipped: number; errors: SyncError[] }> {
    const result = { created: 0, updated: 0, failed: 0, skipped: 0, errors: [] as SyncError[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = startRowNumber + i;
      
      try {
        const data = this.columnMapper.mapSpreadsheetToDatabase(headers, row);
        
        // 買主番号がない場合はスキップ
        if (!data.buyer_number || String(data.buyer_number).trim() === '') {
          result.skipped++;
          continue;
        }

        // 既存レコードを確認
        const { data: existing } = await this.supabase
          .from('buyers')
          .select('id')
          .eq('buyer_number', data.buyer_number)
          .single();

        // Upsert
        const { error } = await this.supabase
          .from('buyers')
          .upsert(
            { 
              ...data, 
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            { onConflict: 'buyer_number' }
          );

        if (error) {
          console.error(`Error syncing row ${rowNumber} (${data.buyer_number}):`, error.message);
          result.failed++;
          
          // Determine error type
          let errorType = SyncErrorType.UNKNOWN_ERROR;
          if (error.message.includes('network') || error.message.includes('timeout')) {
            errorType = SyncErrorType.NETWORK_ERROR;
          } else if (error.message.includes('database') || error.message.includes('connection')) {
            errorType = SyncErrorType.DATABASE_ERROR;
          } else if (error.message.includes('validation') || error.message.includes('constraint')) {
            errorType = SyncErrorType.VALIDATION_ERROR;
          } else if (error.message.includes('schema') || error.message.includes('column')) {
            errorType = SyncErrorType.SCHEMA_ERROR;
          }
          
          result.errors.push({
            row: rowNumber,
            buyerNumber: data.buyer_number,
            message: error.message,
            timestamp: new Date().toISOString(),
            errorType
          });
        } else {
          if (existing) {
            result.updated++;
          } else {
            result.created++;
          }
        }
      } catch (err: any) {
        console.error(`Error processing row ${rowNumber}:`, err.message);
        result.failed++;
        
        // Determine error type
        let errorType = SyncErrorType.UNKNOWN_ERROR;
        if (err.message.includes('validation')) {
          errorType = SyncErrorType.VALIDATION_ERROR;
        }
        
        result.errors.push({
          row: rowNumber,
          buyerNumber: null,
          message: err.message,
          timestamp: new Date().toISOString(),
          errorType
        });
      }
    }

    return result;
  }

  /**
   * 進捗をレポート
   */
  private reportProgress(
    current: number,
    total: number,
    startTime: number,
    callback: (progress: SyncProgress) => void
  ): void {
    const percentage = Math.round((current / total) * 100);
    const elapsed = Date.now() - startTime;
    const rate = current / elapsed; // buyers per ms
    const remaining = total - current;
    const estimatedTimeRemaining = Math.round(remaining / rate);

    const progress: SyncProgress = {
      current,
      total,
      percentage,
      estimatedTimeRemaining
    };

    console.log(`Progress: ${current}/${total} (${percentage}%) - ETA: ${Math.round(estimatedTimeRemaining / 1000)}s`);
    callback(progress);
  }

  /**
   * 成功率を計算
   */
  private calculateSuccessRate(result: SyncResult): number {
    const successful = result.created + result.updated;
    const total = successful + result.failed;
    
    if (total === 0) {
      return 0;
    }
    
    return (successful / total) * 100;
  }

  /**
   * フィールドレベル追跡付きで買主を同期
   */
  async syncBuyerWithFieldTracking(
    buyerNumber: string,
    headers: string[],
    row: any[]
  ): Promise<{ success: boolean; fieldResults: FieldSyncResult[] }> {
    const fieldResults: FieldSyncResult[] = [];
    
    try {
      // Map spreadsheet data to database format
      const data = this.columnMapper.mapSpreadsheetToDatabase(headers, row);
      
      // Get existing buyer data
      const { data: existing } = await this.supabase
        .from('buyers')
        .select('*')
        .eq('buyer_number', buyerNumber)
        .single();

      // Track each field
      const mappedFields = this.columnMapper.getMappedFields();
      
      for (const fieldName of mappedFields) {
        const oldValue = existing ? existing[fieldName] : null;
        const newValue = data[fieldName];
        
        try {
          // Record field sync attempt
          const fieldResult: FieldSyncResult = {
            buyerNumber,
            fieldName,
            success: true,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null
          };
          
          fieldResults.push(fieldResult);
          
          // Log to monitoring service
          await this.syncMonitoring.recordFieldSync(fieldResult);
        } catch (err: any) {
          const fieldResult: FieldSyncResult = {
            buyerNumber,
            fieldName,
            success: false,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null,
            errorMessage: err.message
          };
          
          fieldResults.push(fieldResult);
          await this.syncMonitoring.recordFieldSync(fieldResult);
        }
      }

      // Perform the actual sync
      const { error } = await this.supabase
        .from('buyers')
        .upsert(
          { 
            ...data, 
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'buyer_number' }
        );

      if (error) {
        throw error;
      }

      return { success: true, fieldResults };
    } catch (err: any) {
      // Mark all fields as failed
      const mappedFields = this.columnMapper.getMappedFields();
      for (const fieldName of mappedFields) {
        const fieldResult: FieldSyncResult = {
          buyerNumber,
          fieldName,
          success: false,
          errorMessage: err.message
        };
        
        fieldResults.push(fieldResult);
        await this.syncMonitoring.recordFieldSync(fieldResult);
      }
      
      return { success: false, fieldResults };
    }
  }

  /**
   * フィールドカバレッジを検証
   */
  async validateFieldCoverage(headers: string[]): Promise<{
    allFieldsCovered: boolean;
    missingFields: string[];
    unmappedColumns: string[];
  }> {
    const mappedFields = this.columnMapper.getMappedFields();
    const mappedColumns = this.columnMapper.getMappedColumns(headers);
    
    // Check if all mapped fields have corresponding columns
    const missingFields: string[] = [];
    for (const field of mappedFields) {
      const hasMapping = this.columnMapper.hasColumnMapping(field, headers);
      if (!hasMapping) {
        missingFields.push(field);
      }
    }
    
    // Check for unmapped columns
    const unmappedColumns = headers.filter(
      header => !mappedColumns.includes(header)
    );
    
    const allFieldsCovered = missingFields.length === 0;
    
    if (!allFieldsCovered) {
      console.warn(`Missing field mappings: ${missingFields.join(', ')}`);
    }
    
    if (unmappedColumns.length > 0) {
      console.info(`Unmapped columns: ${unmappedColumns.join(', ')}`);
    }
    
    return {
      allFieldsCovered,
      missingFields,
      unmappedColumns
    };
  }

  /**
   * 特定フィールドのみを同期
   */
  async syncSpecificFields(
    buyerNumber: string,
    fieldNames: string[]
  ): Promise<{ success: boolean; fieldResults: FieldSyncResult[] }> {
    const fieldResults: FieldSyncResult[] = [];
    
    try {
      // Get spreadsheet data
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, '../../google-service-account.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Get headers
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!1:1`,
      });
      const headers = headerResponse.data.values?.[0] || [];

      // Find buyer row
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A2:GZ`,
      });
      const rows = dataResponse.data.values || [];
      
      const buyerNumberIndex = headers.indexOf('買主番号');
      const buyerRow = rows.find(row => String(row[buyerNumberIndex]) === buyerNumber);
      
      if (!buyerRow) {
        throw new Error(`Buyer ${buyerNumber} not found in spreadsheet`);
      }

      // Get existing buyer data
      const { data: existing } = await this.supabase
        .from('buyers')
        .select('*')
        .eq('buyer_number', buyerNumber)
        .single();

      if (!existing) {
        throw new Error(`Buyer ${buyerNumber} not found in database`);
      }

      // Map only specified fields
      const data = this.columnMapper.mapSpreadsheetToDatabase(headers, buyerRow);
      const updateData: any = {};
      
      for (const fieldName of fieldNames) {
        const oldValue = existing[fieldName];
        const newValue = data[fieldName];
        
        try {
          updateData[fieldName] = newValue;
          
          const fieldResult: FieldSyncResult = {
            buyerNumber,
            fieldName,
            success: true,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null
          };
          
          fieldResults.push(fieldResult);
          await this.syncMonitoring.recordFieldSync(fieldResult);
        } catch (err: any) {
          const fieldResult: FieldSyncResult = {
            buyerNumber,
            fieldName,
            success: false,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null,
            errorMessage: err.message
          };
          
          fieldResults.push(fieldResult);
          await this.syncMonitoring.recordFieldSync(fieldResult);
        }
      }

      // Update only specified fields
      const { error } = await this.supabase
        .from('buyers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('buyer_number', buyerNumber);

      if (error) {
        throw error;
      }

      return { success: true, fieldResults };
    } catch (err: any) {
      // Mark all fields as failed
      for (const fieldName of fieldNames) {
        const fieldResult: FieldSyncResult = {
          buyerNumber,
          fieldName,
          success: false,
          errorMessage: err.message
        };
        
        fieldResults.push(fieldResult);
        await this.syncMonitoring.recordFieldSync(fieldResult);
      }
      
      return { success: false, fieldResults };
    }
  }

  /**
   * 最後の同期時刻を取得
   */
  async getLastSyncTime(): Promise<Date | null> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return new Date(data.last_synced_at);
  }

  /**
   * 同期統計を取得
   */
  async getSyncStats(): Promise<{ total: number; lastSync: Date | null }> {
    const { count } = await this.supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    const lastSync = await this.getLastSyncTime();

    return {
      total: count || 0,
      lastSync
    };
  }
}
