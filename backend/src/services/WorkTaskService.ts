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

    // 各タスクにサイドバーカテゴリーを追加
    const tasksWithCategory = (data as WorkTaskData[]).map(task => ({
      ...task,
      sidebar_category: this.calculateSidebarCategory(task),
    }));

    return tasksWithCategory;
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
   * サイドバーカテゴリーを計算（AppSheet式を再現）
   * 表示順序に従って条件をチェック
   */
  calculateSidebarCategory(task: WorkTaskData): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 日付をDateオブジェクトに変換するヘルパー
    const parseDate = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    };

    // 日付をM/D形式でフォーマット
    const formatDate = (dateStr: string | null | undefined): string => {
      if (!dateStr) return '';
      const date = parseDate(dateStr);
      if (!date) return '';
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // 空白チェック
    const isBlank = (value: any): boolean => {
      return value === null || value === undefined || value === '';
    };

    const isNotBlank = (value: any): boolean => {
      return !isBlank(value);
    };

    const settlementDate = parseDate(task.settlement_date);
    const salesContractDeadline = parseDate(task.sales_contract_deadline);
    const bindingScheduledDate = parseDate(task.binding_scheduled_date);
    const siteRegistrationDeadline = parseDate(task.site_registration_deadline);
    const siteRegistrationDueDate = parseDate(task.site_registration_due_date);

    // 条件1: 売買契約確認 = "確認中"
    if (task.sales_contract_confirmed === '確認中') {
      return `売買契約　営業確認中${formatDate(task.sales_contract_deadline)}`;
    }

    // 条件2: 売買契約 入力待ち
    if (
      isNotBlank(task.sales_contract_deadline) &&
      isBlank(task.binding_scheduled_date) &&
      isBlank(task.on_hold) &&
      isBlank(task.binding_completed) &&
      (isBlank(task.settlement_date) || (settlementDate && settlementDate >= today)) &&
      (isNotBlank(task.hirose_request_sales) || isNotBlank(task.cw_request_sales) || isNotBlank(task.employee_contract_creation)) &&
      isBlank(task.accounting_confirmed) &&
      (isBlank(task.cw_completion_email_sales) || isBlank(task.work_completion_chat_hirose))
    ) {
      return `売買契約 入力待ち ${formatDate(task.sales_contract_deadline)} ${task.sales_contract_assignee || ''}`;
    }

    // 条件3: サイト登録依頼してください
    if (
      isBlank(task.site_registration_requestor) &&
      isBlank(task.on_hold) &&
      isBlank(task.distribution_date) &&
      isBlank(task.publish_scheduled_date) &&
      isNotBlank(task.site_registration_deadline) &&
      isBlank(task.sales_contract_deadline)
    ) {
      return `サイト登録依頼してください ${formatDate(task.site_registration_deadline)}`;
    }

    // 条件4: 決済完了チャット送信未
    if (
      settlementDate && settlementDate <= today &&
      settlementDate >= new Date('2025-05-26') &&
      isNotBlank(task.settlement_date) &&
      isBlank(task.settlement_completed_chat) &&
      isNotBlank(task.sales_contract_deadline)
    ) {
      return '決済完了チャット送信未';
    }

    // 条件5: 入金確認未
    if (
      isNotBlank(task.settlement_completed_chat) &&
      (isBlank(task.accounting_confirmed) || task.accounting_confirmed === '未') &&
      isNotBlank(task.sales_contract_deadline)
    ) {
      return '入金確認未';
    }

    // 条件6: 要台帳作成
    if (
      isBlank(task.ledger_created) &&
      isBlank(task.on_hold) &&
      isNotBlank(task.settlement_date) &&
      settlementDate && settlementDate < today &&
      isNotBlank(task.sales_contract_deadline)
    ) {
      return '要台帳作成';
    }

    // 条件7: サイト依頼済み納品待ち（売買契約 製本待ちより前に配置）
    if (
      isBlank(task.site_registration_confirmation_request_date) &&
      isBlank(task.sales_contract_deadline) &&
      isNotBlank(task.site_registration_deadline) &&
      task.site_registration_confirmed !== '完了' &&
      siteRegistrationDeadline && siteRegistrationDeadline >= new Date('2025-10-30')
    ) {
      return `サイト依頼済み納品待ち ${formatDate(task.site_registration_due_date)}`;
    }

    // 条件8: 売買契約 製本待ち
    if (
      isNotBlank(task.sales_contract_deadline) &&
      isNotBlank(task.binding_scheduled_date) &&
      task.sales_contract_confirmed === '確認OK' &&
      isBlank(task.on_hold) &&
      isBlank(task.binding_completed)
    ) {
      return `売買契約 製本待ち ${formatDate(task.binding_scheduled_date)} ${task.sales_contract_assignee || ''}`;
    }

    // 条件9: 売買契約 依頼未
    if (
      isNotBlank(task.sales_contract_deadline) &&
      isBlank(task.binding_scheduled_date) &&
      isBlank(task.binding_completed) &&
      (isBlank(task.settlement_date) || (settlementDate && settlementDate >= today)) &&
      isBlank(task.accounting_confirmed) &&
      isBlank(task.on_hold) &&
      isBlank(task.hirose_request_sales) &&
      isBlank(task.cw_request_sales)
    ) {
      return `売買契約 依頼未 締日${formatDate(task.sales_contract_deadline)} ${task.sales_contract_assignee || ''}`;
    }

    // 条件10: サイト登録要確認
    if (
      isNotBlank(task.site_registration_confirmation_request_date) &&
      isBlank(task.site_registration_confirmed)
    ) {
      return `サイト登録要確認 ${formatDate(task.site_registration_deadline)}`;
    }

    // 条件11: 媒介作成_締日
    if (
      isBlank(task.mediation_completed) &&
      isNotBlank(task.mediation_deadline) &&
      isBlank(task.distribution_date) &&
      isBlank(task.sales_contract_deadline) &&
      isBlank(task.on_hold)
    ) {
      return `媒介作成_締日（${formatDate(task.mediation_deadline)}`;
    }

    // 条件12: 保留
    if (isNotBlank(task.on_hold)) {
      return '保留';
    }

    // デフォルト: 空文字
    return '';
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
