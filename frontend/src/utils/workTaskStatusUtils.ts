// 業務タスクのステータス計算ユーティリティ
// スプレッドシートのIFS式をTypeScriptに変換

export interface WorkTask {
  id: string;
  property_number: string;
  property_address: string;
  seller_name: string;
  sales_assignee: string;
  property_type: string;
  mediation_type: string;
  mediation_deadline: string;
  mediation_completed: string;
  mediation_notes: string;
  sales_contract_confirmed: string;
  sales_contract_deadline: string;
  binding_scheduled_date: string;
  binding_completed: string;
  on_hold: string;
  settlement_date: string;
  hirose_request_sales: string;
  cw_request_sales: string;
  employee_contract_creation: string;
  accounting_confirmed: string;
  cw_completed_email_sales: string;
  work_completed_chat_hirose: string;
  sales_contract_assignee: string;
  site_registration_requestor: string;
  distribution_date: string;
  publish_scheduled_date: string;
  site_registration_deadline: string;
  settlement_completed_chat: string;
  ledger_created: string;
  site_registration_confirm_request_date: string;
  site_registration_confirmed: string;
  [key: string]: any;
}

export interface StatusCategory {
  key: string;
  label: string;
  count: number;
  filter: (task: WorkTask) => boolean;
}

// 日付ヘルパー関数
const isNotBlank = (value: any): boolean => {
  return value !== null && value !== undefined && value !== '';
};

const isBlank = (value: any): boolean => {
  return !isNotBlank(value);
};

const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const formatDateMD = (dateStr: string | null | undefined): string => {
  const d = parseDate(dateStr);
  if (!d) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const today = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const dateGte = (dateStr: string | null | undefined, compareDate: Date): boolean => {
  const d = parseDate(dateStr);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d >= compareDate;
};

const dateLte = (dateStr: string | null | undefined, compareDate: Date): boolean => {
  const d = parseDate(dateStr);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d <= compareDate;
};

const dateLt = (dateStr: string | null | undefined, compareDate: Date): boolean => {
  const d = parseDate(dateStr);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d < compareDate;
};

// 2025-05-26 基準日
const BASE_DATE = new Date('2025-05-26');
// 2025-10-30 基準日
const SITE_REG_BASE_DATE = new Date('2025-10-30');

// ステータス計算関数
export const calculateTaskStatus = (task: WorkTask): string => {
  // 1. 売買契約確認 = "確認中"
  if (task.sales_contract_confirmed === '確認中') {
    return `売買契約　営業確認中${formatDateMD(task.sales_contract_deadline)}`;
  }

  // 2. 売買契約 入力待ち
  if (
    isNotBlank(task.sales_contract_deadline) &&
    isBlank(task.binding_scheduled_date) &&
    isBlank(task.on_hold) &&
    isBlank(task.binding_completed) &&
    (isBlank(task.settlement_date) || dateGte(task.settlement_date, today())) &&
    (isNotBlank(task.hirose_request_sales) || isNotBlank(task.cw_request_sales) || isNotBlank(task.employee_contract_creation)) &&
    isBlank(task.accounting_confirmed) &&
    (isBlank(task.cw_completed_email_sales) || isBlank(task.work_completed_chat_hirose))
  ) {
    return `売買契約 入力待ち ${formatDateMD(task.sales_contract_deadline)} ${task.sales_contract_assignee || ''}`;
  }

  // 3. サイト登録依頼してください
  if (
    isBlank(task.site_registration_requestor) &&
    isBlank(task.on_hold) &&
    isBlank(task.distribution_date) &&
    isBlank(task.publish_scheduled_date) &&
    isNotBlank(task.site_registration_deadline) &&
    isBlank(task.sales_contract_deadline)
  ) {
    return `サイト登録依頼してください ${formatDateMD(task.site_registration_deadline)}`;
  }

  // 4. 決済完了チャット送信未
  if (
    dateLte(task.settlement_date, today()) &&
    dateGte(task.settlement_date, BASE_DATE) &&
    isNotBlank(task.settlement_date) &&
    isBlank(task.settlement_completed_chat) &&
    isNotBlank(task.sales_contract_deadline)
  ) {
    return '決済完了チャット送信未';
  }

  // 5. 入金確認未
  if (
    isNotBlank(task.settlement_completed_chat) &&
    (isBlank(task.accounting_confirmed) || task.accounting_confirmed === '未') &&
    isNotBlank(task.sales_contract_deadline)
  ) {
    return '入金確認未';
  }

  // 6. 要台帳作成
  if (
    isBlank(task.ledger_created) &&
    isBlank(task.on_hold) &&
    isNotBlank(task.settlement_date) &&
    dateLt(task.settlement_date, today()) &&
    isNotBlank(task.sales_contract_deadline)
  ) {
    return '要台帳作成';
  }

  // 7. 売買契約 製本待ち
  if (
    isNotBlank(task.sales_contract_deadline) &&
    isNotBlank(task.binding_scheduled_date) &&
    task.sales_contract_confirmed === '確認OK' &&
    isBlank(task.on_hold) &&
    isBlank(task.binding_completed)
  ) {
    return `売買契約 製本待ち ${formatDateMD(task.binding_scheduled_date)} ${task.sales_contract_assignee || ''}`;
  }

  // 8. 売買契約 依頼未
  if (
    isNotBlank(task.sales_contract_deadline) &&
    isBlank(task.binding_scheduled_date) &&
    isBlank(task.binding_completed) &&
    (isBlank(task.settlement_date) || dateGte(task.settlement_date, today())) &&
    isBlank(task.accounting_confirmed) &&
    isBlank(task.on_hold) &&
    isBlank(task.hirose_request_sales) &&
    isBlank(task.cw_request_sales)
  ) {
    return `売買契約 依頼未 締日${formatDateMD(task.sales_contract_deadline)} ${task.sales_contract_assignee || ''}`;
  }

  // 9. サイト依頼済み納品待ち
  if (
    isBlank(task.site_registration_confirm_request_date) &&
    isBlank(task.sales_contract_deadline) &&
    isNotBlank(task.site_registration_deadline) &&
    task.site_registration_confirmed !== '完了' &&
    dateGte(task.site_registration_deadline, SITE_REG_BASE_DATE)
  ) {
    return 'サイト依頼済み納品待ち';
  }

  // 10. サイト登録要確認
  if (
    isNotBlank(task.site_registration_confirm_request_date) &&
    isBlank(task.site_registration_confirmed)
  ) {
    return `サイト登録要確認 ${formatDateMD(task.site_registration_deadline)}`;
  }

  // 11. 媒介作成_締日
  if (
    isBlank(task.mediation_completed) &&
    isNotBlank(task.mediation_deadline) &&
    isBlank(task.distribution_date) &&
    isBlank(task.sales_contract_deadline) &&
    isBlank(task.on_hold)
  ) {
    return `媒介作成_締日（${formatDateMD(task.mediation_deadline)}`;
  }

  // 12. 保留
  if (isNotBlank(task.on_hold)) {
    return '保留';
  }

  // デフォルト: 空
  return '';
};

// ステータスカテゴリ定義
export const getStatusCategories = (tasks: WorkTask[]): StatusCategory[] => {
  const statusCounts: Record<string, number> = {};
  
  // 各タスクのステータスを計算してカウント
  tasks.forEach(task => {
    const status = calculateTaskStatus(task);
    // ステータスの先頭部分でグループ化（日付や担当者を除く）
    const statusKey = getStatusKey(status);
    if (statusKey) {
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
    }
  });

  // カテゴリ定義（順序付き）
  const categoryDefinitions: { key: string; label: string; matchPrefix: string }[] = [
    { key: 'sales_contract_confirm', label: '売買契約　営業確認中', matchPrefix: '売買契約　営業確認中' },
    { key: 'sales_contract_input', label: '売買契約 入力待ち', matchPrefix: '売買契約 入力待ち' },
    { key: 'site_registration_request', label: 'サイト登録依頼してください', matchPrefix: 'サイト登録依頼してください' },
    { key: 'settlement_chat_pending', label: '決済完了チャット送信未', matchPrefix: '決済完了チャット送信未' },
    { key: 'payment_pending', label: '入金確認未', matchPrefix: '入金確認未' },
    { key: 'ledger_required', label: '要台帳作成', matchPrefix: '要台帳作成' },
    { key: 'sales_contract_binding', label: '売買契約 製本待ち', matchPrefix: '売買契約 製本待ち' },
    { key: 'sales_contract_unrequested', label: '売買契約 依頼未', matchPrefix: '売買契約 依頼未' },
    { key: 'site_delivery_pending', label: 'サイト依頼済み納品待ち', matchPrefix: 'サイト依頼済み納品待ち' },
    { key: 'site_registration_check', label: 'サイト登録要確認', matchPrefix: 'サイト登録要確認' },
    { key: 'mediation_deadline', label: '媒介作成_締日', matchPrefix: '媒介作成_締日' },
    { key: 'on_hold', label: '保留', matchPrefix: '保留' },
  ];

  // 件数が0より大きいカテゴリのみ返す
  const categories: StatusCategory[] = [
    {
      key: 'all',
      label: 'All',
      count: tasks.length,
      filter: () => true,
    },
  ];

  categoryDefinitions.forEach(def => {
    const count = statusCounts[def.key] || 0;
    if (count > 0) {
      categories.push({
        key: def.key,
        label: def.label,
        count,
        filter: (task: WorkTask) => calculateTaskStatus(task).startsWith(def.matchPrefix),
      });
    }
  });

  return categories;
};

// ステータス文字列からキーを抽出
const getStatusKey = (status: string): string => {
  if (!status) return '';
  if (status.startsWith('売買契約　営業確認中')) return 'sales_contract_confirm';
  if (status.startsWith('売買契約 入力待ち')) return 'sales_contract_input';
  if (status.startsWith('サイト登録依頼してください')) return 'site_registration_request';
  if (status.startsWith('決済完了チャット送信未')) return 'settlement_chat_pending';
  if (status.startsWith('入金確認未')) return 'payment_pending';
  if (status.startsWith('要台帳作成')) return 'ledger_required';
  if (status.startsWith('売買契約 製本待ち')) return 'sales_contract_binding';
  if (status.startsWith('売買契約 依頼未')) return 'sales_contract_unrequested';
  if (status.startsWith('サイト依頼済み納品待ち')) return 'site_delivery_pending';
  if (status.startsWith('サイト登録要確認')) return 'site_registration_check';
  if (status.startsWith('媒介作成_締日')) return 'mediation_deadline';
  if (status === '保留') return 'on_hold';
  return '';
};

// タスクをステータスでフィルタリング
export const filterTasksByStatus = (tasks: WorkTask[], statusKey: string): WorkTask[] => {
  if (statusKey === 'all') return tasks;
  
  return tasks.filter(task => {
    const status = calculateTaskStatus(task);
    const taskStatusKey = getStatusKey(status);
    return taskStatusKey === statusKey;
  });
};
