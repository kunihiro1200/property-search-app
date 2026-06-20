import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WorkTaskData } from './WorkTaskColumnMapper';

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * 業務依頼データサービス
 */
export class WorkTaskService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 物件番号でデータを取得
   */
  async getByPropertyNumber(propertyNumber: string): Promise<WorkTaskData | null> {
    const { data, error } = await this.supabase
      .from('work_tasks')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

    if (error || !data) {
      return null;
    }

    return data as WorkTaskData;
  }

  /**
   * 売主IDでデータを取得（売主番号 = 物件番号）
   */
  async getBySellerId(sellerId: string): Promise<WorkTaskData | null> {
    // まず売主テーブルから売主番号を取得
    const { data: seller, error: sellerError } = await this.supabase
      .from('sellers')
      .select('seller_number')
      .eq('id', sellerId)
      .single();

    if (sellerError || !seller) {
      return null;
    }

    // 売主番号で業務依頼データを取得
    return this.getByPropertyNumber(seller.seller_number);
  }

  /**
   * 売主番号でデータを取得
   */
  async getBySellerNumber(sellerNumber: string): Promise<WorkTaskData | null> {
    return this.getByPropertyNumber(sellerNumber);
  }

  /**
   * 一覧取得
   */
  async list(options: ListOptions = {}): Promise<WorkTaskData[]> {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = options;

    const { data, error } = await this.supabase
      .from('work_tasks')
      .select('*')
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return [];
    }

    return data as WorkTaskData[];
  }

  /**
   * 決済予定月で検索
   */
  async getBySettlementMonth(month: string): Promise<WorkTaskData[]> {
    const { data, error } = await this.supabase
      .from('work_tasks')
      .select('*')
      .eq('settlement_scheduled_month', month)
      .order('settlement_date', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data as WorkTaskData[];
  }

  /**
   * 決済日の範囲で検索
   */
  async getBySettlementDateRange(startDate: string, endDate: string): Promise<WorkTaskData[]> {
    const { data, error } = await this.supabase
      .from('work_tasks')
      .select('*')
      .gte('settlement_date', startDate)
      .lte('settlement_date', endDate)
      .order('settlement_date', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data as WorkTaskData[];
  }

  /**
   * 総件数を取得
   */
  async count(): Promise<number> {
    const { count, error } = await this.supabase
      .from('work_tasks')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return 0;
    }

    return count || 0;
  }

  /**
   * 物件番号でデータを更新
   */
  async updateByPropertyNumber(propertyNumber: string, updates: Partial<WorkTaskData>): Promise<WorkTaskData | null> {
    // updated_atを自動更新
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('work_tasks')
      .update(updateData)
      .eq('property_number', propertyNumber)
      .select()
      .single();

    if (error) {
      console.error('業務依頼データ更新エラー:', error);
      throw new Error(`更新に失敗しました: ${error.message}`);
    }

    return data as WorkTaskData;
  }
}
