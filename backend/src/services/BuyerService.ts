// 買主リストのCRUDサービス
import { createClient } from '@supabase/supabase-js';
import { AuditLogService } from './AuditLogService';
import { BuyerWriteService } from './BuyerWriteService';
import { ConflictResolver, ConflictInfo } from './ConflictResolver';
import { RetryHandler } from './RetryHandler';
import { BuyerColumnMapper } from './BuyerColumnMapper';
import { GoogleSheetsClient } from './GoogleSheetsClient';

export interface BuyerQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean; // 削除済み買主を含めるかどうか
}

export interface SyncResult {
  success: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  error?: string;
  conflict?: ConflictInfo[];
}

export interface UpdateWithSyncResult {
  buyer: any;
  syncResult: SyncResult;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BuyerService {
  private supabase;
  private writeService: BuyerWriteService | null = null;
  private conflictResolver: ConflictResolver | null = null;
  private retryHandler: RetryHandler | null = null;
  private columnMapper: BuyerColumnMapper | null = null;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * 双方向同期用のサービスを初期化（遅延初期化）
   */
  private async initSyncServices(): Promise<void> {
    if (this.writeService) return;

    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
    
    // 認証を実行
    await sheetsClient.authenticate();
    
    this.columnMapper = new BuyerColumnMapper();
    this.writeService = new BuyerWriteService(sheetsClient, this.columnMapper);
    this.conflictResolver = new ConflictResolver(this.writeService, this.columnMapper);
    this.retryHandler = new RetryHandler(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * 買主リストを取得（ページネーション、検索、フィルタ対応）
   */
  async getAll(options: BuyerQueryOptions = {}): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      assignee,
      dateFrom,
      dateTo,
      sortBy = 'reception_date',
      sortOrder = 'desc',
      includeDeleted = false, // デフォルトで削除済みを除外
    } = options;

    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('buyers')
      .select('*', { count: 'exact' });

    // 削除済みを除外（デフォルト）
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // 検索
    if (search) {
      query = query.or(
        `buyer_number.ilike.%${search}%,name.ilike.%${search}%,phone_number.ilike.%${search}%,property_number.ilike.%${search}%`
      );
    }

    // フィルタリング
    if (status) {
      query = query.ilike('latest_status', `%${status}%`);
    }
    if (assignee) {
      query = query.or(`initial_assignee.ilike.%${assignee}%,follow_up_assignee.ilike.%${assignee}%`);
    }
    if (dateFrom) {
      query = query.gte('reception_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('reception_date', dateTo);
    }

    // ソート（受付日が空欄のものは一番後ろに配置）
    // nullsFirst: false で NULL値を最後に配置
    // 受付日が同じ場合は買主番号の降順でソート
    query = query
      .order(sortBy, { 
        ascending: sortOrder === 'asc',
        nullsFirst: false 
      })
      .order('buyer_number', { ascending: false }); // 買主番号の降順（新しい順）

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch buyers: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data || [],
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * IDで買主を取得（buyer_id）
   * 注意: このメソッドはbuyer_id（文字列型のUUID）で検索します。
   * 買主番号で検索する場合は getByBuyerNumber() を使用してください。
   */
  async getById(id: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('*')
      .eq('buyer_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch buyer: ${error.message}`);
    }

    return data;
  }

  /**
   * 買主番号で買主を取得
   */
  async getByBuyerNumber(buyerNumber: string, includeDeleted: boolean = false): Promise<any | null> {
    console.log(`[BuyerService.getByBuyerNumber] buyerNumber=${buyerNumber}, includeDeleted=${includeDeleted}`);
    
    let query = this.supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', buyerNumber);

    // 削除済みを除外（デフォルト）
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.single();

    if (error) {
      console.log(`[BuyerService.getByBuyerNumber] error:`, error);
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch buyer: ${error.message}`);
    }

    console.log(`[BuyerService.getByBuyerNumber] found buyer id=${data?.id}`);
    return data;
  }


  /**
   * 検索
   */
  async search(query: string, limit: number = 20): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('id, buyer_number, name, phone_number, email, property_number, latest_status, initial_assignee')
      .is('deleted_at', null) // 削除済みを除外
      .or(
        `buyer_number.ilike.%${query}%,name.ilike.%${query}%,phone_number.ilike.%${query}%,property_number.ilike.%${query}%`
      )
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search buyers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 買主に紐づく物件リストを取得
   * 
   * 取得元:
   * 1. buyers.property_number（初回問い合わせ物件）
   * 
   * 注意: inquiry_historyテーブルは現在存在しないため、
   * buyers.property_numberのみから物件を取得します。
   */
  async getLinkedProperties(buyerId: string): Promise<any[]> {
    const propertyNumbersSet = new Set<string>();

    // buyers.property_number から物件番号を取得
    const buyer = await this.getById(buyerId);
    if (!buyer) {
      console.log(`[BuyerService.getLinkedProperties] Buyer not found: ${buyerId}`);
      return [];
    }

    if (buyer.property_number) {
      const propertyNumbers = buyer.property_number
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => n);
      
      console.log(`[BuyerService.getLinkedProperties] Found property numbers from buyer.property_number:`, propertyNumbers);
      propertyNumbers.forEach(pn => propertyNumbersSet.add(pn));
    }

    // 物件番号が1つもない場合は空配列を返す
    if (propertyNumbersSet.size === 0) {
      console.log(`[BuyerService.getLinkedProperties] No property numbers found for buyer ${buyerId}`);
      return [];
    }

    // 物件番号で物件リストを検索
    const propertyNumbers = Array.from(propertyNumbersSet);
    console.log(`[BuyerService.getLinkedProperties] Fetching properties:`, propertyNumbers);
    
    const { data, error } = await this.supabase
      .from('property_listings')
      .select('*')
      .in('property_number', propertyNumbers);

    if (error) {
      console.error(`[BuyerService.getLinkedProperties] Error fetching properties:`, error);
      throw new Error(`Failed to fetch linked properties: ${error.message}`);
    }

    console.log(`[BuyerService.getLinkedProperties] Found ${data?.length || 0} properties`);
    return data || [];
  }

  /**
   * 物件番号から買主を取得
   */
  async getByPropertyNumber(propertyNumber: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('*')
      .ilike('property_number', `%${propertyNumber}%`);

    if (error) {
      throw new Error(`Failed to fetch buyers by property: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byAssignee: Record<string, number>;
    byConfidence: Record<string, number>;
  }> {
    // 総数
    const { count: total } = await this.supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    // ステータス別
    const { data: statusData } = await this.supabase
      .from('buyers')
      .select('latest_status')
      .not('latest_status', 'is', null);

    const byStatus: Record<string, number> = {};
    statusData?.forEach(row => {
      const key = row.latest_status || '未設定';
      byStatus[key] = (byStatus[key] || 0) + 1;
    });

    // 担当者別
    const { data: assigneeData } = await this.supabase
      .from('buyers')
      .select('initial_assignee, follow_up_assignee');

    const byAssignee: Record<string, number> = {};
    assigneeData?.forEach(row => {
      const assignee = row.follow_up_assignee || row.initial_assignee || '未設定';
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
    });

    // 確度別
    const { data: confidenceData } = await this.supabase
      .from('buyers')
      .select('inquiry_confidence')
      .not('inquiry_confidence', 'is', null);

    const byConfidence: Record<string, number> = {};
    confidenceData?.forEach(row => {
      const key = row.inquiry_confidence || '未設定';
      byConfidence[key] = (byConfidence[key] || 0) + 1;
    });

    return {
      total: total || 0,
      byStatus,
      byAssignee,
      byConfidence
    };
  }

  /**
   * 新規買主を作成
   */
  async create(buyerData: Partial<any>): Promise<any> {
    // 買主番号を自動生成
    const buyerNumber = await this.generateBuyerNumber();

    const newBuyer = {
      ...buyerData,
      buyer_number: buyerNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('buyers')
      .insert(newBuyer)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create buyer: ${error.message}`);
    }

    return data;
  }

  /**
   * 買主番号を自動生成（最新の番号+1）
   */
  private async generateBuyerNumber(): Promise<string> {
    // 最新の買主番号を取得
    const { data, error } = await this.supabase
      .from('buyers')
      .select('buyer_number')
      .order('buyer_number', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to generate buyer number: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // 最初の買主番号
      return '1';
    }

    // 最新の番号を取得して+1
    const latestNumber = parseInt(data[0].buyer_number, 10);
    if (isNaN(latestNumber)) {
      throw new Error('Invalid buyer number format');
    }

    return String(latestNumber + 1);
  }

  /**
   * 買主情報を更新
   */
  async update(id: string, updateData: Partial<any>, userId?: string, userEmail?: string): Promise<any> {
    // 存在確認
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Buyer not found');
    }

    // 更新不可フィールドを除外
    const protectedFields = ['id', 'db_created_at', 'synced_at'];
    const allowedData: any = {};
    
    for (const key in updateData) {
      if (!protectedFields.includes(key)) {
        // 日付フィールドの空文字列をnullに変換
        if ((key === 'reception_date' || key === 'next_call_date' || key === 'latest_viewing_date') && updateData[key] === '') {
          allowedData[key] = null;
        } else {
          allowedData[key] = updateData[key];
        }
      }
    }

    // 更新タイムスタンプを追加
    allowedData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('buyers')
      .update(allowedData)
      .eq('buyer_id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update buyer: ${error.message}`);
    }

    // Log audit trail for each changed field
    if (userId && userEmail) {
      for (const key in allowedData) {
        if (key !== 'updated_at' && existing[key] !== allowedData[key]) {
          try {
            await AuditLogService.logFieldUpdate(
              'buyer',
              id,
              key,
              existing[key],
              allowedData[key],
              userId,
              userEmail
            );
          } catch (auditError) {
            // Log error but don't fail the update
            console.error('Failed to create audit log:', auditError);
          }
        }
      }
    }

    return data;
  }

  /**
   * 買主情報を更新し、スプレッドシートに同期
   * @param id 買主ID
   * @param updateData 更新データ
   * @param userId ユーザーID
   * @param userEmail ユーザーメール
   * @param options オプション（force: 競合を無視して強制上書き）
   * @returns 更新結果と同期ステータス
   */
  async updateWithSync(
    id: string,
    updateData: Partial<any>,
    userId?: string,
    userEmail?: string,
    options?: { force?: boolean }
  ): Promise<UpdateWithSyncResult> {
    // 同期サービスを初期化（認証含む）
    await this.initSyncServices();

    // 存在確認
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Buyer not found');
    }

    const buyerNumber = existing.buyer_number;

    // 更新不可フィールドを除外
    const protectedFields = ['buyer_id', 'created_at', 'synced_at', 'buyer_number'];
    const allowedData: any = {};
    
    for (const key in updateData) {
      if (!protectedFields.includes(key)) {
        // 日付フィールドの空文字列をnullに変換
        if ((key === 'reception_date' || key === 'next_call_date' || key === 'latest_viewing_date') && updateData[key] === '') {
          allowedData[key] = null;
        } else {
          allowedData[key] = updateData[key];
        }
      }
    }

    // 更新タイムスタンプを追加
    allowedData.updated_at = new Date().toISOString();

    // 競合チェック（forceオプションがない場合、かつ前回同期済みの場合のみ）
    // last_synced_at がない場合は、まだ一度も同期されていないため競合チェックをスキップ
    // 注意: 競合チェックは、スプレッドシートが他のユーザーによって変更された場合のみ検出する
    // DBの値が変更されただけでは競合とはみなさない
    if (!options?.force && this.conflictResolver && existing.last_synced_at) {
      // スプレッドシートの現在値を取得して、DBの前回同期時の値と比較
      // 期待値は「前回同期時のスプレッドシートの値」= DBの現在値（同期後に変更されていない場合）
      // ただし、ユーザーがDBを編集した場合は、その編集前の値が期待値となる
      // 
      // 簡略化: 競合チェックは、スプレッドシートの値がDBの値と異なる場合のみ行う
      // これにより、ユーザーがDBを編集してスプレッドシートに同期する際に、
      // スプレッドシートが他のユーザーによって変更されていた場合のみ競合を検出する
      const expectedValues: Record<string, any> = {};
      for (const key of Object.keys(allowedData)) {
        // 期待値は、DBの現在値（編集前の値）
        expectedValues[key] = existing[key];
      }

      const conflictResult = await this.conflictResolver.checkConflict(
        buyerNumber,
        allowedData,
        expectedValues,
        new Date(existing.last_synced_at)
      );

      if (conflictResult.hasConflict) {
        // 競合がある場合、DBは更新せずに競合情報を返す
        return {
          buyer: existing,
          syncResult: {
            success: false,
            syncStatus: 'failed',
            error: 'Conflict detected',
            conflict: conflictResult.conflicts
          }
        };
      }
    }

    // DB更新
    const { data, error } = await this.supabase
      .from('buyers')
      .update(allowedData)
      .eq('buyer_id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update buyer: ${error.message}`);
    }

    // スプレッドシート同期を試行
    let syncResult: SyncResult;

    try {
      if (this.writeService && this.retryHandler) {
        // リトライ付きで同期を実行
        const retryResult = await this.retryHandler.executeWithRetry(
          async () => {
            const writeResult = await this.writeService!.updateFields(buyerNumber, allowedData);
            if (!writeResult.success) {
              throw new Error(writeResult.error || 'Spreadsheet write failed');
            }
            return writeResult;
          }
        );

        if (retryResult.success) {
          // 同期成功 - last_synced_atを更新
          await this.supabase
            .from('buyers')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('buyer_id', id);

          syncResult = {
            success: true,
            syncStatus: 'synced'
          };
        } else {
          // 同期失敗 - キューに追加
          for (const key of Object.keys(allowedData)) {
            if (key !== 'db_updated_at') {
              await this.retryHandler.queueFailedChange({
                buyer_number: buyerNumber,
                field_name: key,
                old_value: existing[key] ? String(existing[key]) : null,
                new_value: allowedData[key] ? String(allowedData[key]) : null,
                retry_count: retryResult.attempts,
                last_error: retryResult.error || null
              });
            }
          }

          syncResult = {
            success: false,
            syncStatus: 'pending',
            error: retryResult.error
          };
        }
      } else {
        // 同期サービスが利用できない場合
        syncResult = {
          success: false,
          syncStatus: 'pending',
          error: 'Sync services not available'
        };
      }
    } catch (syncError: any) {
      // 同期エラー - キューに追加
      if (this.retryHandler) {
        for (const key of Object.keys(allowedData)) {
          if (key !== 'db_updated_at') {
            await this.retryHandler.queueFailedChange({
              buyer_number: buyerNumber,
              field_name: key,
              old_value: existing[key] ? String(existing[key]) : null,
              new_value: allowedData[key] ? String(allowedData[key]) : null,
              retry_count: 0,
              last_error: syncError.message
            });
          }
        }
      }

      syncResult = {
        success: false,
        syncStatus: 'pending',
        error: syncError.message
      };
    }

    // 監査ログを記録（sync_status付き）
    if (userId && userEmail) {
      for (const key in allowedData) {
        if (key !== 'updated_at' && existing[key] !== allowedData[key]) {
          try {
            await AuditLogService.logFieldUpdate(
              'buyer',
              id,
              key,
              existing[key],
              allowedData[key],
              userId,
              userEmail,
              syncResult.syncStatus
            );
          } catch (auditError) {
            console.error('Failed to create audit log:', auditError);
          }
        }
      }
    }

    return {
      buyer: data,
      syncResult
    };
  }
  async getExportData(options: BuyerQueryOptions = {}): Promise<any[]> {
    const { search, status, assignee, dateFrom, dateTo } = options;

    let query = this.supabase
      .from('buyers')
      .select('*');

    if (search) {
      query = query.or(
        `buyer_number.ilike.%${search}%,name.ilike.%${search}%,phone_number.ilike.%${search}%`
      );
    }
    if (status) {
      query = query.ilike('latest_status', `%${status}%`);
    }
    if (assignee) {
      query = query.or(`initial_assignee.ilike.%${assignee}%,follow_up_assignee.ilike.%${assignee}%`);
    }
    if (dateFrom) {
      query = query.gte('reception_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('reception_date', dateTo);
    }

    query = query.order('buyer_number', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to export buyers: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Parse past_buyer_list column into array of buyer numbers
   * @param pastBuyerList - Comma-separated string of past buyer numbers
   * @returns Array of trimmed buyer numbers
   */
  parsePastBuyerList(pastBuyerList: string | null | undefined): string[] {
    if (!pastBuyerList || pastBuyerList.trim() === '') {
      return [];
    }

    return pastBuyerList
      .split(',')
      .map(num => num.trim())
      .filter(num => num.length > 0);
  }

  /**
   * Get all past buyer numbers for a buyer
   * @param buyerId - The buyer ID
   * @returns Array of past buyer numbers with metadata
   */
  async getPastBuyerNumbers(buyerId: string): Promise<Array<{
    buyerNumber: string;
    propertyNumber: string | null;
    inquiryDate: string | null;
    inquirySource: string | null;
  }>> {
    // Get the buyer record
    const buyer = await this.getById(buyerId);
    if (!buyer) {
      throw new Error(`Buyer not found: ${buyerId}`);
    }

    // Parse past buyer list
    const pastBuyerNumbers = this.parsePastBuyerList(buyer.past_buyer_list);
    
    if (pastBuyerNumbers.length === 0) {
      return [];
    }

    // For each past buyer number, try to find inquiry details
    // Since past buyer numbers are historical, we need to search for them
    // in the buyers table (they might still exist as separate records)
    const { data: pastBuyerRecords, error } = await this.supabase
      .from('buyers')
      .select('buyer_number, property_number, reception_date, inquiry_source')
      .in('buyer_number', pastBuyerNumbers);

    if (error) {
      console.error('Error fetching past buyer records:', error);
      // Return basic info even if we can't fetch details
      return pastBuyerNumbers.map(num => ({
        buyerNumber: num,
        propertyNumber: null,
        inquiryDate: null,
        inquirySource: null
      }));
    }

    // Create a map of buyer number to details
    const detailsMap = new Map(
      (pastBuyerRecords || []).map(record => [
        record.buyer_number,
        {
          propertyNumber: record.property_number,
          inquiryDate: record.reception_date,
          inquirySource: record.inquiry_source
        }
      ])
    );

    // Return array with details where available
    return pastBuyerNumbers.map(num => ({
      buyerNumber: num,
      propertyNumber: detailsMap.get(num)?.propertyNumber || null,
      inquiryDate: detailsMap.get(num)?.inquiryDate || null,
      inquirySource: detailsMap.get(num)?.inquirySource || null
    }));
  }

  /**
   * Get inquiry history for a specific buyer number
   * @param buyerNumber - The buyer number to look up
   * @returns Inquiry details including property, date, source, status
   */
  async getInquiryHistoryByBuyerNumber(buyerNumber: string): Promise<{
    buyerNumber: string;
    propertyNumber: string | null;
    inquiryDate: string | null;
    inquirySource: string | null;
    status: string | null;
    buyerId: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('id, buyer_number, property_number, reception_date, inquiry_source, latest_status')
      .eq('buyer_number', buyerNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch inquiry history: ${error.message}`);
    }

    return {
      buyerNumber: data.buyer_number,
      propertyNumber: data.property_number,
      inquiryDate: data.reception_date,
      inquirySource: data.inquiry_source,
      status: data.latest_status,
      buyerId: data.id
    };
  }

  /**
   * Get complete inquiry history across all buyer numbers for a buyer
   * @param buyerId - The buyer ID
   * @returns Array of all inquiries including current and past buyer numbers
   */
  async getCompleteInquiryHistory(buyerId: string): Promise<Array<{
    buyerNumber: string;
    propertyNumber: string | null;
    inquiryDate: string | null;
    inquirySource: string | null;
    status: string | null;
    isCurrent: boolean;
  }>> {
    const buyer = await this.getById(buyerId);
    if (!buyer) {
      throw new Error(`Buyer not found: ${buyerId}`);
    }

    const history: Array<{
      buyerNumber: string;
      propertyNumber: string | null;
      inquiryDate: string | null;
      inquirySource: string | null;
      status: string | null;
      isCurrent: boolean;
    }> = [];

    // Add current buyer number inquiry
    history.push({
      buyerNumber: buyer.buyer_number,
      propertyNumber: buyer.property_number,
      inquiryDate: buyer.reception_date,
      inquirySource: buyer.inquiry_source,
      status: buyer.latest_status,
      isCurrent: true
    });

    // Add past buyer numbers
    const pastBuyerNumbers = await this.getPastBuyerNumbers(buyerId);
    for (const past of pastBuyerNumbers) {
      history.push({
        buyerNumber: past.buyerNumber,
        propertyNumber: past.propertyNumber,
        inquiryDate: past.inquiryDate,
        inquirySource: past.inquirySource,
        status: null, // Past records may not have current status
        isCurrent: false
      });
    }

    // Sort by inquiry date (most recent first)
    history.sort((a, b) => {
      if (!a.inquiryDate) return 1;
      if (!b.inquiryDate) return -1;
      return new Date(b.inquiryDate).getTime() - new Date(a.inquiryDate).getTime();
    });

    return history;
  }

  /**
   * Get inquiry history for buyer detail page
   * Returns all property inquiries associated with current and past buyer numbers
   * @param buyerId - The buyer ID
   * @returns Array of inquiry history items with property details
   */
  /**
   * Get inquiry history for buyer detail page
   * Returns all property inquiries associated with current and past buyer numbers
   * @param buyerNumber - The buyer number
   * @returns Array of inquiry history items with property details
   */
  async getInquiryHistory(buyerNumber: string): Promise<Array<{
    buyerNumber: string;
    propertyNumber: string;
    propertyAddress: string;
    inquiryDate: string;
    status: 'current' | 'past';
    propertyId: string;
    propertyListingId: string;
  }>> {
    return this.getInquiryHistoryByBuyerNumberInternal(buyerNumber);
  }

  /**
   * Get inquiry history by buyer number (internal method)
   * @param buyerNumber - The buyer number
   * @returns Array of inquiry history items with property details
   */
  private async getInquiryHistoryByBuyerNumberInternal(buyerNumber: string): Promise<Array<{
    buyerNumber: string;
    propertyNumber: string;
    propertyAddress: string;
    inquiryDate: string;
    status: 'current' | 'past';
    propertyId: string;
    propertyListingId: string;
  }>> {
    // Get the buyer by buyer_number
    const buyer = await this.getByBuyerNumber(buyerNumber);
    if (!buyer) {
      throw new Error(`Buyer not found: ${buyerNumber}`);
    }

    // Collect all property numbers from current buyer
    const allPropertyNumbers: string[] = [];
    const propertyToBuyerMap = new Map<string, { 
      buyerNumber: string; 
      status: 'current' | 'past';
      inquiryDate: string;
    }>();

    // Parse current buyer's property numbers
    if (buyer.property_number) {
      const currentPropertyNumbers = buyer.property_number
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => n)
        // 物件番号のパターンのみを抽出（AA, BB, CC, DD, EE, FF, GG, HH, II, JJ, KK, LL, MM, NN, OO, PP, QQ, RR, SS, TT, UU, VV, WW, XX, YY, ZZ で始まる番号）
        // 完全一致のみ（先頭から末尾まで）
        // 異常に長い文字列（100文字以上）はスキップ
        .filter((n: string) => n.length < 100 && /^[A-Z]{2}\d+(-\d+)?$/.test(n));
      
      currentPropertyNumbers.forEach((propNum: string) => {
        allPropertyNumbers.push(propNum);
        propertyToBuyerMap.set(propNum, {
          buyerNumber: buyer.buyer_number,
          status: 'current',
          inquiryDate: buyer.reception_date || ''
        });
      });
    }

    // Get past buyer numbers and their property numbers
    const pastBuyerNumbers = this.parsePastBuyerList(buyer.past_buyer_list);
    
    for (const pastBuyerNumber of pastBuyerNumbers) {
      // Fetch past buyer data
      const { data: pastBuyer, error: pastBuyerError } = await this.supabase
        .from('buyers')
        .select('buyer_number, property_number, reception_date')
        .eq('buyer_number', pastBuyerNumber)
        .single();

      if (!pastBuyerError && pastBuyer && pastBuyer.property_number) {
        const pastPropertyNumbers = pastBuyer.property_number
          .split(',')
          .map((n: string) => n.trim())
          .filter((n: string) => n)
          // 物件番号のパターンのみを抽出
          // 完全一致のみ（先頭から末尾まで）
          // 異常に長い文字列（100文字以上）はスキップ
          .filter((n: string) => n.length < 100 && /^[A-Z]{2}\d+(-\d+)?$/.test(n));
        
        pastPropertyNumbers.forEach((propNum: string) => {
          allPropertyNumbers.push(propNum);
          propertyToBuyerMap.set(propNum, {
            buyerNumber: pastBuyer.buyer_number,
            status: 'past',
            inquiryDate: pastBuyer.reception_date || ''
          });
        });
      }
    }

    // Remove duplicates
    const uniquePropertyNumbers = Array.from(new Set(allPropertyNumbers));

    if (uniquePropertyNumbers.length === 0) {
      return [];
    }

    // Fetch property listings for all property numbers
    const { data: properties, error } = await this.supabase
      .from('property_listings')
      .select(`
        property_number,
        address
      `)
      .in('property_number', uniquePropertyNumbers);

    if (error) {
      console.error('[getInquiryHistoryByBuyerNumberInternal] Supabase error:', error);
      console.error('[getInquiryHistoryByBuyerNumberInternal] uniquePropertyNumbers:', uniquePropertyNumbers);
      throw new Error(`Failed to fetch inquiry history: ${error.message}`);
    }

    if (!properties || properties.length === 0) {
      return [];
    }

    // Map to inquiry history format
    const history = properties.map(property => {
      const buyerInfo = propertyToBuyerMap.get(property.property_number);
      return {
        buyerNumber: buyerInfo?.buyerNumber || buyer.buyer_number,
        propertyNumber: property.property_number,
        propertyAddress: property.address || '',
        inquiryDate: buyerInfo?.inquiryDate || '',
        status: buyerInfo?.status || 'current',
        propertyId: property.property_number,  // property_numberを使用
        propertyListingId: property.property_number,  // property_numberを使用
      };
    });

    // Sort by inquiry date (most recent first)
    history.sort((a, b) => {
      if (!a.inquiryDate) return 1;
      if (!b.inquiryDate) return -1;
      return new Date(b.inquiryDate).getTime() - new Date(a.inquiryDate).getTime();
    });

    return history;
  }

  /**
   * 配信エリア番号に該当する買主を取得（買主候補と同じ条件でフィルタリング）
   * @param areaNumbers - エリア番号の配列（例: ["①", "②", "③", "㊵"]）
   * @param propertyType - 物件種別（オプション）
   * @param salesPrice - 売出価格（オプション）
   * @returns 該当する買主のリスト
   */
  async getBuyersByAreas(
    areaNumbers: string[],
    propertyType?: string | null,
    salesPrice?: number | null
  ): Promise<any[]> {
    if (!areaNumbers || areaNumbers.length === 0) {
      return [];
    }

    console.log(`[BuyerService.getBuyersByAreas] Searching for buyers in areas:`, areaNumbers);
    console.log(`[BuyerService.getBuyersByAreas] Property type:`, propertyType);
    console.log(`[BuyerService.getBuyersByAreas] Sales price:`, salesPrice);

    // 全ての買主を取得（フィルタリングは後で行う）
    // ソートはフィルタリング後にJavaScript側で行う（複雑なソート条件のため）
    // 注意: Supabase Postgrestのmax-rows設定により、1回のクエリで取得できる最大件数が制限されている
    // そのため、ページネーションを使用して全件取得する
    const allBuyers: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('buyers')
        .select(`
          buyer_id,
          buyer_number,
          name,
          latest_status,
          latest_viewing_date,
          inquiry_confidence,
          inquiry_source,
          distribution_type,
          distribution_areas,
          broker_inquiry,
          desired_area,
          desired_property_type,
          price_range_house,
          price_range_apartment,
          price_range_land,
          reception_date,
          email,
          phone_number
        `)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`[BuyerService.getBuyersByAreas] Error:`, error);
        throw new Error(`Failed to fetch buyers by areas: ${error.message}`);
      }

      if (data && data.length > 0) {
        allBuyers.push(...data);
        console.log(`[BuyerService.getBuyersByAreas] Fetched page ${page + 1}: ${data.length} buyers (total: ${allBuyers.length})`);
        
        // 取得したデータが pageSize より少ない場合は、これが最後のページ
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`[BuyerService.getBuyersByAreas] Fetched ${allBuyers.length} buyers from database (${page + 1} pages)`);

    // BuyerCandidateServiceと同じ条件でフィルタリング
    const filteredBuyers = this.filterBuyerCandidates(
      allBuyers,
      areaNumbers,
      propertyType,
      salesPrice
    );

    console.log(`[BuyerService.getBuyersByAreas] After filtering: ${filteredBuyers.length} buyers`);

    // ソート: 1. reception_date DESC (newest first), 2. inquiry_confidence DESC (A > B > C > D)
    const sortedBuyers = this.sortBuyersByDateAndConfidence(filteredBuyers);

    console.log(`[BuyerService.getBuyersByAreas] After sorting: ${sortedBuyers.length} buyers`);
    
    // distribution_areasを配列に変換（文字列の場合）
    // 注意: データベースではdesired_areaカラムに希望エリアが入っている
    const buyersWithParsedAreas = sortedBuyers.map(buyer => ({
      ...buyer,
      distribution_areas: this.parseDistributionAreas(buyer.distribution_areas || buyer.desired_area)
    }));
    
    return buyersWithParsedAreas;
  }
  
  /**
   * distribution_areasを配列に変換
   * @param distributionAreas - 配信エリア（文字列または配列）
   * @returns 配信エリアの配列
   */
  private parseDistributionAreas(distributionAreas: any): string[] {
    if (!distributionAreas) {
      return [];
    }
    
    // 既に配列の場合はそのまま返す
    if (Array.isArray(distributionAreas)) {
      return distributionAreas;
    }
    
    // 文字列の場合はパース
    if (typeof distributionAreas === 'string') {
      // カンマ区切りまたはスペース区切りで分割
      return distributionAreas
        .split(/[,\s]+/)
        .map(area => area.trim())
        .filter(area => area.length > 0);
    }
    
    return [];
  }

  /**
   * 買主候補をフィルタリング（BuyerCandidateServiceと同じロジック）
   */
  private filterBuyerCandidates(
    buyers: any[],
    propertyAreaNumbers: string[],
    propertyType?: string | null,
    salesPrice?: number | null
  ): any[] {
    return buyers.filter(buyer => {
      // 1. 除外条件の評価（早期リターン）
      if (this.shouldExcludeBuyer(buyer)) {
        return false;
      }

      // 2. 最新状況/問合せ時確度フィルタ
      if (!this.matchesStatus(buyer)) {
        return false;
      }

      // 3. エリアフィルタ
      if (!this.matchesAreaCriteria(buyer, propertyAreaNumbers)) {
        return false;
      }

      // 4. 種別フィルタ（物件種別が指定されている場合のみ）
      if (propertyType && !this.matchesPropertyTypeCriteria(buyer, propertyType)) {
        return false;
      }

      // 5. 価格帯フィルタ（売出価格が指定されている場合のみ）
      if (salesPrice && !this.matchesPriceCriteria(buyer, salesPrice, propertyType)) {
        return false;
      }

      return true;
    });
  }

  /**
   * 買主を受付日と確度でソート
   * 1. reception_date DESC (newest first, nulls last)
   * 2. inquiry_confidence DESC (A > B > C > D > E > F > ... > null)
   */
  private sortBuyersByDateAndConfidence(buyers: any[]): any[] {
    return buyers.sort((a, b) => {
      // 1. reception_date DESC (newest first, nulls last)
      // nullの場合は0（最も古い日付）として扱い、最後に配置
      const dateA = a.reception_date ? new Date(a.reception_date).getTime() : 0;
      const dateB = b.reception_date ? new Date(b.reception_date).getTime() : 0;
      
      if (dateA !== dateB) {
        // DESC order: 新しい日付が先に来る（2026 > 2025）
        return dateB - dateA;
      }

      // 2. inquiry_confidence DESC (A > B > C > D)
      const confidenceA = (a.inquiry_confidence || '').trim().toUpperCase();
      const confidenceB = (b.inquiry_confidence || '').trim().toUpperCase();
      
      // 確度の優先順位を定義
      const confidenceOrder: { [key: string]: number } = {
        'A': 1,
        'B': 2,
        'C': 3,
        'D': 4,
        'E': 5,
        'F': 6,
        'G': 7,
        'H': 8,
        'I': 9,
        'J': 10,
      };
      
      const orderA = confidenceOrder[confidenceA] || 999; // 未定義は最後
      const orderB = confidenceOrder[confidenceB] || 999;
      
      return orderA - orderB; // ASC (A first)
    });
  }

  /**
   * 買主を除外すべきかどうかを判定
   */
  private shouldExcludeBuyer(buyer: any): boolean {
    // デバッグログ（買主4370の場合のみ）
    if (buyer.buyer_number === '4370') {
      console.log(`[DEBUG] 買主4370の除外チェック開始`);
    }
    
    // 1. 業者問合せは除外
    if (this.isBusinessInquiry(buyer)) {
      if (buyer.buyer_number === '4370') {
        console.log(`[DEBUG] 買主4370: 業者問合せのため除外`);
      }
      return true;
    }

    // 2. 希望エリアと希望種別が両方空欄の場合は除外
    if (!this.hasMinimumCriteria(buyer)) {
      if (buyer.buyer_number === '4370') {
        console.log(`[DEBUG] 買主4370: 最低限の条件を満たしていないため除外`);
      }
      return true;
    }

    // 3. 配信種別が「要」でない場合は除外
    if (!this.hasDistributionRequired(buyer)) {
      if (buyer.buyer_number === '4370') {
        console.log(`[DEBUG] 買主4370: 配信種別が「要」ではないため除外`);
      }
      return true;
    }

    if (buyer.buyer_number === '4370') {
      console.log(`[DEBUG] 買主4370: 除外されない（全ての条件をクリア）`);
    }
    
    return false;
  }

  /**
   * 業者問合せかどうかを判定
   */
  private isBusinessInquiry(buyer: any): boolean {
    const inquirySource = (buyer.inquiry_source || '').trim();
    const distributionType = (buyer.distribution_type || '').trim();
    const brokerInquiry = (buyer.broker_inquiry || '').trim();

    // 問合せ元が「業者問合せ」
    if (inquirySource === '業者問合せ' || inquirySource.includes('業者')) {
      return true;
    }

    // 配信種別が「業者問合せ」
    if (distributionType === '業者問合せ' || distributionType.includes('業者')) {
      return true;
    }

    // 業者問合せフラグに値がある場合
    if (brokerInquiry && brokerInquiry !== '' && brokerInquiry !== '0' && brokerInquiry.toLowerCase() !== 'false') {
      return true;
    }

    return false;
  }

  /**
   * 最低限の希望条件を持っているかを判定
   */
  private hasMinimumCriteria(buyer: any): boolean {
    const desiredArea = (buyer.desired_area || '').trim();
    const desiredPropertyType = (buyer.desired_property_type || '').trim();

    // 希望エリアまたは希望種別のいずれかが入力されていればtrue
    return desiredArea !== '' || desiredPropertyType !== '';
  }

  /**
   * 配信種別が「要」かどうかを判定
   */
  private hasDistributionRequired(buyer: any): boolean {
    const distributionType = (buyer.distribution_type || '').trim();
    
    // デバッグログ（買主4370の場合のみ）
    if (buyer.buyer_number === '4370') {
      console.log(`[DEBUG] 買主4370の配信種別チェック:`);
      console.log(`  distribution_type: "${buyer.distribution_type}"`);
      console.log(`  trim後: "${distributionType}"`);
      console.log(`  判定結果: ${distributionType === '要' ? '✅ 要' : '❌ 要ではない'}`);
    }
    
    return distributionType === '要';
  }

  /**
   * 最新状況によるフィルタリング
   */
  private matchesStatus(buyer: any): boolean {
    const latestStatus = (buyer.latest_status || '').trim();

    // 買付またはDを含む場合は除外
    if (latestStatus.includes('買付') || latestStatus.includes('D')) {
      return false;
    }

    return true;
  }

  /**
   * エリア条件によるフィルタリング
   */
  private matchesAreaCriteria(buyer: any, propertyAreaNumbers: string[]): boolean {
    const desiredArea = (buyer.desired_area || '').trim();

    // 希望エリアが空欄の場合は条件を満たす
    if (!desiredArea) {
      return true;
    }

    // 物件の配信エリアが空欄の場合は条件を満たさない
    if (propertyAreaNumbers.length === 0) {
      return false;
    }

    // 買主の希望エリアを抽出
    const buyerAreaNumbers = this.extractAreaNumbers(desiredArea);

    // 1つでも合致すれば条件を満たす
    return propertyAreaNumbers.some(area => buyerAreaNumbers.includes(area));
  }

  /**
   * 種別条件によるフィルタリング
   */
  private matchesPropertyTypeCriteria(buyer: any, propertyType: string | null): boolean {
    const desiredType = (buyer.desired_property_type || '').trim();

    // 希望種別が「指定なし」の場合は条件を満たす
    if (desiredType === '指定なし') {
      return true;
    }

    // 希望種別が空欄の場合は条件を満たさない
    if (!desiredType) {
      return false;
    }

    // 物件種別が空欄の場合は条件を満たさない
    if (!propertyType) {
      return false;
    }

    // データベースの英語値を日本語に変換
    const propertyTypeMap: Record<string, string> = {
      'land': '土地',
      'detached_house': '戸建',
      'apartment': 'マンション',
    };
    
    const japanesePropertyType = propertyTypeMap[propertyType] || propertyType;

    // 種別の正規化と比較
    const normalizedPropertyType = this.normalizePropertyType(japanesePropertyType);
    const normalizedDesiredTypes = desiredType.split(/[,、\s]+/).map((t: string) => this.normalizePropertyType(t));

    // デバッグログ（買主6767の場合のみ）
    if (buyer.buyer_number === '6767') {
      console.log(`[DEBUG] 買主6767の種別フィルタリング:`);
      console.log(`  物件種別（元）: ${propertyType}`);
      console.log(`  物件種別（日本語）: ${japanesePropertyType}`);
      console.log(`  物件種別（正規化）: ${normalizedPropertyType}`);
      console.log(`  買主希望種別（元）: ${desiredType}`);
      console.log(`  買主希望種別（正規化）: ${JSON.stringify(normalizedDesiredTypes)}`);
    }

    // いずれかの希望種別が物件種別と合致すれば条件を満たす
    const isMatch = normalizedDesiredTypes.some((dt: string) => 
      dt === normalizedPropertyType || 
      normalizedPropertyType.includes(dt) ||
      dt.includes(normalizedPropertyType)
    );

    // デバッグログ（買主6767の場合のみ）
    if (buyer.buyer_number === '6767') {
      console.log(`  マッチング結果: ${isMatch ? '✅ マッチ' : '❌ マッチしない'}`);
    }

    return isMatch;
  }

  /**
   * 価格帯条件によるフィルタリング
   */
  private matchesPriceCriteria(
    buyer: any,
    salesPrice: number | null,
    propertyType: string | null
  ): boolean {
    // 物件価格が空欄の場合は条件を満たす
    if (!salesPrice) {
      return true;
    }

    // データベースの英語値を日本語に変換
    const propertyTypeMap: Record<string, string> = {
      'land': '土地',
      'detached_house': '戸建',
      'apartment': 'マンション',
    };
    
    const japanesePropertyType = propertyTypeMap[propertyType || ''] || propertyType;

    // 物件種別に応じた価格帯フィールドを選択
    let priceRange: string | null = null;
    const normalizedType = this.normalizePropertyType(japanesePropertyType || '');

    if (normalizedType === '戸建' || normalizedType.includes('戸建')) {
      priceRange = buyer.price_range_house;
    } else if (normalizedType === 'マンション' || normalizedType.includes('マンション')) {
      priceRange = buyer.price_range_apartment;
    } else if (normalizedType === '土地' || normalizedType.includes('土地')) {
      priceRange = buyer.price_range_land;
    }

    // 価格帯が空欄の場合は条件を満たす
    if (!priceRange || !priceRange.trim()) {
      return true;
    }

    // 価格帯をパースして範囲チェック
    const { min, max } = this.parsePriceRange(priceRange);
    return salesPrice >= min && salesPrice <= max;
  }

  /**
   * エリア番号を抽出
   */
  private extractAreaNumbers(areaString: string): string[] {
    const circledNumbers = areaString.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]/g) || [];
    return circledNumbers;
  }

  /**
   * 種別を正規化
   */
  private normalizePropertyType(type: string): string {
    const normalized = type.trim()
      .replace(/中古/g, '')
      .replace(/新築/g, '')
      .replace(/一戸建て/g, '戸建')
      .replace(/一戸建/g, '戸建')
      .replace(/戸建て/g, '戸建')
      .replace(/分譲/g, '')
      .trim();
    return normalized;
  }

  /**
   * 価格帯をパース
   */
  private parsePriceRange(priceRange: string): { min: number; max: number } {
    let min = 0;
    let max = Number.MAX_SAFE_INTEGER;

    const cleanedRange = priceRange
      .replace(/,/g, '')
      .replace(/円/g, '')
      .replace(/万/g, '0000')
      .replace(/億/g, '00000000')
      .trim();

    // 範囲パターン
    const rangeMatch = cleanedRange.match(/(\d+)?\s*[〜～\-]\s*(\d+)?/);
    if (rangeMatch) {
      if (rangeMatch[1]) {
        min = parseInt(rangeMatch[1], 10);
      }
      if (rangeMatch[2]) {
        max = parseInt(rangeMatch[2], 10);
      }
      return { min, max };
    }

    // 以上/以下パターン
    const aboveMatch = cleanedRange.match(/(\d+)\s*以上/);
    if (aboveMatch) {
      min = parseInt(aboveMatch[1], 10);
      return { min, max };
    }

    const belowMatch = cleanedRange.match(/(\d+)\s*以下/);
    if (belowMatch) {
      max = parseInt(belowMatch[1], 10);
      return { min, max };
    }

    // 単一値パターン
    const singleMatch = cleanedRange.match(/^(\d+)$/);
    if (singleMatch) {
      const value = parseInt(singleMatch[1], 10);
      min = value * 0.8;
      max = value * 1.2;
      return { min, max };
    }

    return { min, max };
  }

  /**
   * 全買主を取得し、各買主のステータスを算出
   * @returns 買主リスト（calculated_statusフィールド付き）
   */
  async getBuyersWithStatus(options: BuyerQueryOptions = {}): Promise<PaginatedResult<any>> {
    try {
      // BuyerStatusCalculatorをインポート
      const { calculateBuyerStatus, calculateBuyerStatusComplete } = await import('./BuyerStatusCalculator');
      
      // 買主リストを取得
      const result = await this.getAll(options);
      
      // 各買主のステータスを算出
      const buyersWithStatus = result.data.map(buyer => {
        try {
          // まずPriority 1-16を評価
          let statusResult = calculateBuyerStatus(buyer);
          
          // Priority 1-16で一致しなければPriority 17-37を評価
          if (!statusResult.status || statusResult.priority === 0) {
            statusResult = calculateBuyerStatusComplete(buyer);
          }
          
          return {
            ...buyer,
            calculated_status: statusResult.status,
            status_priority: statusResult.priority,
            status_color: statusResult.color
          };
        } catch (error) {
          // ステータス算出エラー時はデフォルト値を返す
          console.error(`[BuyerService.getBuyersWithStatus] Error calculating status for buyer ${buyer.buyer_number}:`, error);
          return {
            ...buyer,
            calculated_status: '',
            status_priority: 999,
            status_color: '#9E9E9E'
          };
        }
      });
      
      return {
        ...result,
        data: buyersWithStatus
      };
    } catch (error) {
      console.error('[BuyerService.getBuyersWithStatus] Error:', error);
      throw new Error(`Failed to get buyers with status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ステータスごとの買主数をカウント
   * @returns ステータスカテゴリーの配列
   */
  async getStatusCategories(): Promise<Array<{
    status: string;
    count: number;
    priority: number;
    color: string;
  }>> {
    try {
      // BuyerStatusCalculatorとステータス定義をインポート
      const { calculateBuyerStatus, calculateBuyerStatusComplete } = await import('./BuyerStatusCalculator');
      const { STATUS_DEFINITIONS } = await import('../config/buyer-status-definitions');
      
      // 全買主を取得（ページネーションなし、削除済みを除外）
      // Supabaseのデフォルト制限（1000件）を回避するために、全件取得
      let allBuyers: any[] = [];
      let fetchPage = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error, count } = await this.supabase
          .from('buyers')
          .select('*', { count: 'exact' })
          .is('deleted_at', null)
          .range(fetchPage * pageSize, (fetchPage + 1) * pageSize - 1);
        
        if (error) {
          console.error('[BuyerService.getStatusCategories] Database error:', error);
          throw new Error(`Failed to fetch buyers for status categories: ${error.message}`);
        }
        
        if (data && data.length > 0) {
          allBuyers = allBuyers.concat(data);
          fetchPage++;
          hasMore = data.length === pageSize; // 1000件取得できた場合は次のページがある可能性
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[BuyerService.getStatusCategories] Fetched ${allBuyers.length} buyers total`);
      
      // ステータスごとのカウントマップ
      const statusCountMap = new Map<string, number>();
      
      // 各買主のステータスを算出してカウント
      (allBuyers || []).forEach(buyer => {
        try {
          // まずPriority 1-16を評価
          let statusResult = calculateBuyerStatus(buyer);
          
          // Priority 1-16で一致しなければPriority 17-37を評価
          if (!statusResult.status || statusResult.priority === 0) {
            statusResult = calculateBuyerStatusComplete(buyer);
          }
          
          const status = statusResult.status || ''; // 空文字列の場合もカウント
          
          statusCountMap.set(status, (statusCountMap.get(status) || 0) + 1);
        } catch (error) {
          // ステータス算出エラー時は空文字列としてカウント
          console.error(`[BuyerService.getStatusCategories] Error calculating status for buyer ${buyer.buyer_number}:`, error);
          statusCountMap.set('', (statusCountMap.get('') || 0) + 1);
        }
      });
      
      // ステータスカテゴリーの配列を作成
      const categories: Array<{
        status: string;
        count: number;
        priority: number;
        color: string;
      }> = [];
      
      // 全てのステータス定義を走査
      STATUS_DEFINITIONS.forEach((definition) => {
        const count = statusCountMap.get(definition.status) || 0;
        
        // カウントが0でも表示する（UIで全てのステータスを表示するため）
        categories.push({
          status: definition.status,
          count,
          priority: definition.priority,
          color: definition.color
        });
      });
      
      // 空文字列のステータス（該当なし）も追加
      const emptyStatusCount = statusCountMap.get('') || 0;
      if (emptyStatusCount > 0) {
        categories.push({
          status: '',
          count: emptyStatusCount,
          priority: 999, // 最低優先度
          color: '#9E9E9E' // グレー
        });
      }
      
      // 優先順位でソート（昇順）
      categories.sort((a, b) => a.priority - b.priority);
      
      return categories;
    } catch (error) {
      console.error('[BuyerService.getStatusCategories] Error:', error);
      throw new Error(`Failed to get status categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 特定のステータスに該当する買主を取得
   * @param status - ステータス文字列
   * @param options - クエリオプション
   * @returns 該当する買主のリスト
   */
  async getBuyersByStatus(
    status: string,
    options: BuyerQueryOptions = {}
  ): Promise<PaginatedResult<any>> {
    try {
      // BuyerStatusCalculatorをインポート
      const { calculateBuyerStatus } = await import('./BuyerStatusCalculator');
      
      // 全買主を取得（ページネーションなし - フィルタリング後にページネーション、削除済みを除外）
      // Supabaseのデフォルト制限（1000件）を回避するために、全件取得
      let allBuyers: any[] = [];
      let fetchPage = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await this.supabase
          .from('buyers')
          .select('*')
          .is('deleted_at', null)
          .range(fetchPage * pageSize, (fetchPage + 1) * pageSize - 1);
        
        if (error) {
          console.error('[BuyerService.getBuyersByStatus] Database error:', error);
          throw new Error(`Failed to fetch buyers by status: ${error.message}`);
        }
        
        if (data && data.length > 0) {
          allBuyers = allBuyers.concat(data);
          fetchPage++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[BuyerService.getBuyersByStatus] Fetched ${allBuyers.length} buyers total for status filtering`);
      
      // ステータスでフィルタリング
      const filteredBuyers = (allBuyers || [])
        .map(buyer => {
          try {
            const statusResult = calculateBuyerStatus(buyer);
            return {
              ...buyer,
              calculated_status: statusResult.status,
              status_priority: statusResult.priority,
              status_color: statusResult.color
            };
          } catch (error) {
            // ステータス算出エラー時はデフォルト値を返す
            console.error(`[BuyerService.getBuyersByStatus] Error calculating status for buyer ${buyer.buyer_number}:`, error);
            return {
              ...buyer,
              calculated_status: '',
              status_priority: 999,
              status_color: '#9E9E9E'
            };
          }
        })
        .filter(buyer => buyer.calculated_status === status);
      
      // ページネーション
      const {
        page = 1,
        limit = 50,
        sortBy = 'reception_date',
        sortOrder = 'desc'
      } = options;
      
      const offset = (page - 1) * limit;
      const total = filteredBuyers.length;
      const totalPages = Math.ceil(total / limit);
      
      // ソート
      filteredBuyers.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // ページネーション適用
      const paginatedData = filteredBuyers.slice(offset, offset + limit);
      
      return {
        data: paginatedData,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('[BuyerService.getBuyersByStatus] Error:', error);
      throw new Error(`Failed to get buyers by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

