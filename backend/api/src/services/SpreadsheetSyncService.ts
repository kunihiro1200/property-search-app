import { GoogleSheetsClient, SheetRow } from './GoogleSheetsClient';
import { ColumnMapper, SellerData } from './ColumnMapper';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SyncResult {
  success: boolean;
  rowsAffected: number;
  error?: string;
  operation?: 'create' | 'update' | 'delete';
}

export interface BatchSyncResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ sellerId: string; error: string }>;
}

/**
 * スプレッドシート同期サービス
 * 
 * Supabaseのデータをスプレッドシートに同期します。
 * 単一レコードの同期とバッチ同期をサポートします。
 */
export class SpreadsheetSyncService {
  private sheetsClient: GoogleSheetsClient;
  private columnMapper: ColumnMapper;
  private supabase: SupabaseClient;
  private sellerNumberColumn: string = '売主番号';

  constructor(
    sheetsClient: GoogleSheetsClient,
    supabase: SupabaseClient
  ) {
    this.sheetsClient = sheetsClient;
    this.columnMapper = new ColumnMapper();
    this.supabase = supabase;
  }

  /**
   * 単一の売主レコードをスプレッドシートに同期
   */
  async syncToSpreadsheet(sellerId: string): Promise<SyncResult> {
    try {
      // Supabaseから売主データを取得
      const { data: seller, error } = await this.supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (error || !seller) {
        return {
          success: false,
          rowsAffected: 0,
          error: `Seller not found: ${sellerId}`,
        };
      }

      // スプレッドシート形式に変換
      const sheetRow = this.columnMapper.mapToSheet(seller as SellerData);

      // 売主番号で既存行を検索
      const existingRowIndex = await this.findRowBySellerId(seller.seller_number);

      if (existingRowIndex) {
        // 既存行を更新
        await this.sheetsClient.updateRow(existingRowIndex, sheetRow);
        
        // Supabaseの同期時刻を更新
        await this.updateSyncTimestamp(sellerId);

        return {
          success: true,
          rowsAffected: 1,
          operation: 'update',
        };
      } else {
        // 新規行を追加
        await this.sheetsClient.appendRow(sheetRow);
        
        // Supabaseの同期時刻を更新
        await this.updateSyncTimestamp(sellerId);

        return {
          success: true,
          rowsAffected: 1,
          operation: 'create',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        rowsAffected: 0,
        error: error.message,
      };
    }
  }

  /**
   * 複数の売主レコードをバッチでスプレッドシートに同期
   */
  async syncBatchToSpreadsheet(sellerIds: string[]): Promise<BatchSyncResult> {
    const errors: Array<{ sellerId: string; error: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Supabaseから売主データを一括取得
      const { data: sellers, error } = await this.supabase
        .from('sellers')
        .select('*')
        .in('id', sellerIds);

      if (error || !sellers) {
        return {
          success: false,
          totalRows: sellerIds.length,
          successCount: 0,
          failureCount: sellerIds.length,
          errors: [{ sellerId: 'all', error: error?.message || 'Failed to fetch sellers' }],
        };
      }

      // バッチ更新用のデータを準備
      const updates: Array<{ rowIndex: number; values: SheetRow }> = [];
      const newRows: SheetRow[] = [];
      const syncedSellerIds: string[] = [];

      for (const seller of sellers) {
        try {
          // スプレッドシート形式に変換
          const sheetRow = this.columnMapper.mapToSheet(seller as SellerData);

          // 売主番号で既存行を検索
          const existingRowIndex = await this.findRowBySellerId(seller.seller_number);

          if (existingRowIndex) {
            updates.push({ rowIndex: existingRowIndex, values: sheetRow });
          } else {
            newRows.push(sheetRow);
          }

          syncedSellerIds.push(seller.id);
          successCount++;
        } catch (error: any) {
          errors.push({ sellerId: seller.id, error: error.message });
          failureCount++;
        }
      }

      // バッチ更新を実行
      if (updates.length > 0) {
        await this.sheetsClient.batchUpdate(updates);
      }

      // 新規行を追加
      for (const row of newRows) {
        await this.sheetsClient.appendRow(row);
      }

      // Supabaseの同期時刻を一括更新
      if (syncedSellerIds.length > 0) {
        await this.batchUpdateSyncTimestamp(syncedSellerIds);
      }

      return {
        success: failureCount === 0,
        totalRows: sellerIds.length,
        successCount,
        failureCount,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        totalRows: sellerIds.length,
        successCount,
        failureCount: sellerIds.length - successCount,
        errors: [...errors, { sellerId: 'batch', error: error.message }],
      };
    }
  }

  /**
   * 売主番号でスプレッドシートの行を検索
   */
  private async findRowBySellerId(sellerNumber: string): Promise<number | null> {
    try {
      return await this.sheetsClient.findRowByColumn(this.sellerNumberColumn, sellerNumber);
    } catch (error) {
      // カラムが見つからない場合はnullを返す
      return null;
    }
  }

  /**
   * スプレッドシートから売主レコードを削除
   */
  async deleteFromSpreadsheet(sellerId: string): Promise<SyncResult> {
    try {
      // Supabaseから売主番号を取得
      const { data: seller, error } = await this.supabase
        .from('sellers')
        .select('seller_number')
        .eq('id', sellerId)
        .single();

      if (error || !seller) {
        return {
          success: false,
          rowsAffected: 0,
          error: `Seller not found: ${sellerId}`,
        };
      }

      // スプレッドシートで行を検索
      const rowIndex = await this.findRowBySellerId(seller.seller_number);

      if (!rowIndex) {
        return {
          success: false,
          rowsAffected: 0,
          error: `Row not found in spreadsheet for seller: ${seller.seller_number}`,
        };
      }

      // 行を削除
      await this.sheetsClient.deleteRow(rowIndex);

      return {
        success: true,
        rowsAffected: 1,
        operation: 'delete',
      };
    } catch (error: any) {
      return {
        success: false,
        rowsAffected: 0,
        error: error.message,
      };
    }
  }

  /**
   * Supabaseの同期時刻を更新
   */
  private async updateSyncTimestamp(sellerId: string): Promise<void> {
    await this.supabase
      .from('sellers')
      .update({ synced_to_sheet_at: new Date().toISOString() })
      .eq('id', sellerId);
  }

  /**
   * Supabaseの同期時刻を一括更新
   */
  private async batchUpdateSyncTimestamp(sellerIds: string[]): Promise<void> {
    await this.supabase
      .from('sellers')
      .update({ synced_to_sheet_at: new Date().toISOString() })
      .in('id', sellerIds);
  }

  /**
   * 同期が必要な売主を取得（最終同期時刻が更新時刻より古い）
   */
  async getUnsyncedSellers(limit: number = 100): Promise<string[]> {
    const { data: sellers, error } = await this.supabase
      .from('sellers')
      .select('id')
      .or('synced_to_sheet_at.is.null,synced_to_sheet_at.lt.updated_at')
      .limit(limit);

    if (error || !sellers) {
      return [];
    }

    return sellers.map(s => s.id);
  }

  /**
   * すべての売主を同期（差分同期）
   */
  async syncAllUnsynced(): Promise<BatchSyncResult> {
    const unsynced = await this.getUnsyncedSellers(1000);
    
    if (unsynced.length === 0) {
      return {
        success: true,
        totalRows: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
      };
    }

    return await this.syncBatchToSpreadsheet(unsynced);
  }

  /**
   * スプレッドシートから最新データを取得
   */
  async fetchLatestData(): Promise<SheetRow[]> {
    try {
      const rows = await this.sheetsClient.readAll();
      return rows;
    } catch (error: any) {
      console.error('Failed to fetch latest data from spreadsheet:', error);
      throw new Error(`Failed to fetch spreadsheet data: ${error.message}`);
    }
  }

  /**
   * キャッシュデータとスプレッドシートデータを比較して差分を計算
   */
  async compareWithCache(cachedData: SheetRow[]): Promise<DataDiff> {
    try {
      const latestData = await this.fetchLatestData();
      
      // キャッシュデータをMapに変換（高速検索用）
      const cachedMap = new Map(cachedData.map(seller => [String(seller['売主番号'] || ''), seller]));
      const latestMap = new Map(latestData.map(seller => [String(seller['売主番号'] || ''), seller]));
      
      const added: SheetRow[] = [];
      const updated: SheetRow[] = [];
      const deleted: string[] = [];
      
      // 追加・更新されたレコードを検出
      for (const [sellerNumber, latestSeller] of latestMap) {
        const cachedSeller = cachedMap.get(sellerNumber);
        
        if (!cachedSeller) {
          // 新規追加
          added.push(latestSeller);
        } else if (this.hasChanges(cachedSeller, latestSeller)) {
          // 更新
          updated.push(latestSeller);
        }
      }
      
      // 削除されたレコードを検出
      for (const [sellerNumber, cachedSeller] of cachedMap) {
        if (!latestMap.has(sellerNumber)) {
          deleted.push(String(cachedSeller['id'] || sellerNumber));
        }
      }
      
      return { added, updated, deleted };
    } catch (error: any) {
      console.error('Failed to compare with cache:', error);
      throw new Error(`Failed to compare data: ${error.message}`);
    }
  }

  /**
   * 2つの売主データに変更があるかチェック
   */
  private hasChanges(cached: SheetRow, latest: SheetRow): boolean {
    // 簡易的な比較（JSON文字列で比較）
    return JSON.stringify(cached) !== JSON.stringify(latest);
  }

  /**
   * 差分をデータベースに適用
   */
  async applyChanges(diff: DataDiff): Promise<DetailedSyncResult> {
    const errors: Array<{ record: string; error: string }> = [];
    let recordsAdded = 0;
    let recordsUpdated = 0;
    let recordsDeleted = 0;
  
    try {
      // 追加されたレコードを挿入
      for (const seller of diff.added) {
        try {
          const { error } = await this.supabase
            .from('sellers')
            .insert(seller);
          
          if (error) throw error;
          recordsAdded++;
        } catch (error: any) {
          const sellerNumber = String(seller['売主番号'] || 'unknown');
          errors.push({ record: sellerNumber, error: error.message });
        }
      }
      
      // 更新されたレコードを更新
      for (const seller of diff.updated) {
        try {
          const { error } = await this.supabase
            .from('sellers')
            .update(seller)
            .eq('seller_number', String(seller['売主番号'] || ''));
          
          if (error) throw error;
          recordsUpdated++;
        } catch (error: any) {
          const sellerNumber = String(seller['売主番号'] || 'unknown');
          errors.push({ record: sellerNumber, error: error.message });
        }
      }
      
      // 削除されたレコードを削除
      for (const sellerId of diff.deleted) {
        try {
          const { error } = await this.supabase
            .from('sellers')
            .delete()
            .eq('id', sellerId);
          
          if (error) throw error;
          recordsDeleted++;
        } catch (error: any) {
          errors.push({ record: sellerId, error: error.message });
        }
      }
      
      return {
        success: errors.length === 0,
        recordsAdded,
        recordsUpdated,
        recordsDeleted,
        errors,
      };
    } catch (error: any) {
      console.error('Failed to apply changes:', error);
      throw new Error(`Failed to apply changes: ${error.message}`);
    }
  }
}

/**
 * データ差分情報
 */
export interface DataDiff {
  added: SheetRow[];
  updated: SheetRow[];
  deleted: string[]; // seller IDs
}

/**
 * 同期結果の詳細情報
 */
export interface DetailedSyncResult {
  success: boolean;
  recordsUpdated: number;
  recordsAdded: number;
  recordsDeleted: number;
  errors: Array<{ record: string; error: string }>;
}

