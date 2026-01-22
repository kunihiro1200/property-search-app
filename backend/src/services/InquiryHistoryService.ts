import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InquiryHistory, CreateInquiryHistoryRequest, UpdateInquiryHistoryRequest } from '../types';

export class InquiryHistoryService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * 売主IDで問合せ履歴を取得
   * 時系列順（降順）でソート
   */
  async getInquiryHistories(sellerId: string): Promise<InquiryHistory[]> {
    const { data, error } = await this.supabase
      .from('inquiry_histories')
      .select('*')
      .eq('seller_id', sellerId)
      .order('inquiry_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch inquiry histories: ${error.message}`);
    }

    return (data || []).map(this.mapToInquiryHistory);
  }

  /**
   * 問合せ履歴を作成
   */
  async createInquiryHistory(request: CreateInquiryHistoryRequest): Promise<InquiryHistory> {
    const { data, error } = await this.supabase
      .from('inquiry_histories')
      .insert({
        seller_id: request.sellerId,
        inquiry_date: request.inquiryDate,
        inquiry_site: request.inquirySite,
        inquiry_reason: request.inquiryReason,
        is_current_status: request.isCurrentStatus || false,
        notes: request.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create inquiry history: ${error.message}`);
    }

    return this.mapToInquiryHistory(data);
  }

  /**
   * is_current_statusを更新
   * 既存のis_current_statusをすべてfalseに更新してから、
   * 指定された問合せ履歴のis_current_statusをtrueに更新
   */
  async updateCurrentStatus(sellerId: string, inquiryHistoryId: string): Promise<void> {
    // トランザクション的な処理を実現するため、2つのクエリを順次実行
    
    // 1. 既存のis_current_statusをすべてfalseに更新
    const { error: resetError } = await this.supabase
      .from('inquiry_histories')
      .update({ is_current_status: false })
      .eq('seller_id', sellerId);

    if (resetError) {
      throw new Error(`Failed to reset current status: ${resetError.message}`);
    }

    // 2. 指定された問合せ履歴のis_current_statusをtrueに更新
    const { error: updateError } = await this.supabase
      .from('inquiry_histories')
      .update({ is_current_status: true })
      .eq('id', inquiryHistoryId)
      .eq('seller_id', sellerId);

    if (updateError) {
      throw new Error(`Failed to update current status: ${updateError.message}`);
    }
  }

  /**
   * 問合せ履歴を更新
   */
  async updateInquiryHistory(
    id: string,
    request: UpdateInquiryHistoryRequest
  ): Promise<InquiryHistory> {
    const updateData: any = {};

    if (request.inquiryDate !== undefined) {
      updateData.inquiry_date = request.inquiryDate;
    }
    if (request.inquirySite !== undefined) {
      updateData.inquiry_site = request.inquirySite;
    }
    if (request.inquiryReason !== undefined) {
      updateData.inquiry_reason = request.inquiryReason;
    }
    if (request.isCurrentStatus !== undefined) {
      updateData.is_current_status = request.isCurrentStatus;
    }
    if (request.notes !== undefined) {
      updateData.notes = request.notes;
    }

    const { data, error } = await this.supabase
      .from('inquiry_histories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update inquiry history: ${error.message}`);
    }

    return this.mapToInquiryHistory(data);
  }

  /**
   * 問合せ履歴を削除
   */
  async deleteInquiryHistory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('inquiry_histories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete inquiry history: ${error.message}`);
    }
  }

  /**
   * データベースレコードをInquiryHistory型にマッピング
   */
  private mapToInquiryHistory(record: any): InquiryHistory {
    return {
      id: record.id,
      sellerId: record.seller_id,
      inquiryDate: new Date(record.inquiry_date),
      inquirySite: record.inquiry_site,
      inquiryReason: record.inquiry_reason,
      isCurrentStatus: record.is_current_status,
      notes: record.notes,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}
