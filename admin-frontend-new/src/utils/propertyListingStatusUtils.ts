// 物件リストのステータス計算ユーティリティ
// AppSheetの数式をTypeScriptに変換

export interface PropertyListing {
  property_number: string;
  sales_assignee: string | null;
  atbb_status: string | null;
  confirmation: string | null;
  general_mediation_private: string | null;
  single_listing: string | null;
  suumo_url: string | null;
  suumo_registered: string | null;
  offer_status: string | null;
  report_date: string | null;
  report_assignee: string | null;
  [key: string]: any;
}

export interface WorkTask {
  property_number: string;
  publish_scheduled_date: string | null;  // 公開予定日
  [key: string]: any;
}

// ステータスの定義（優先度順）
export const PROPERTY_STATUS_DEFINITIONS = [
  { key: 'unreported', label: '未報告', color: '#f44336' },
  { key: 'incomplete', label: '未完了', color: '#ff9800' },
  { key: 'private_pending', label: '非公開予定（確認後）', color: '#9c27b0' },
  { key: 'general_listing_unconfirmed', label: '一般媒介の掲載確認未', color: '#e91e63' },
  { key: 'today_publish', label: '本日公開予定', color: '#4caf50' },
  { key: 'suumo_required', label: 'SUUMO URL　要登録', color: '#2196f3' },
  { key: 'reins_suumo_required', label: 'レインズ登録＋SUUMO登録', color: '#3f51b5' },
  { key: 'offer_no_viewing', label: '買付申込み（内覧なし）２', color: '#00bcd4' },
  { key: 'pre_publish', label: '公開前情報', color: '#607d8b' },
  { key: 'private_email_only', label: '非公開（配信メールのみ）', color: '#795548' },
  { key: 'general_public', label: '一般公開中物件', color: '#8bc34a' },
  { key: 'exclusive_y', label: 'Y専任公開中', color: '#ff5722' },
  { key: 'exclusive_ikuno', label: '生・専任公開中', color: '#ff5722' },
  { key: 'exclusive_hisa', label: '久・専任公開中', color: '#ff5722' },
  { key: 'exclusive_u', label: 'U専任公開中', color: '#ff5722' },
  { key: 'exclusive_hayashi', label: '林・専任公開中', color: '#ff5722' },
  { key: 'exclusive_k', label: 'K専任公開中', color: '#ff5722' },
  { key: 'exclusive_r', label: 'R専任公開中', color: '#ff5722' },
  { key: 'exclusive_i', label: 'I専任公開中', color: '#ff5722' },
  { key: 'other', label: 'その他', color: '#9e9e9e' },
];

// 今日の日付を取得（時刻なし）
const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// 日付文字列をDateに変換
const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  } catch {
    return null;
  }
};

// 業務依頼テーブルから公開予定日を取得するためのマップを作成
export const createWorkTaskMap = (workTasks: WorkTask[]): Map<string, Date | null> => {
  const map = new Map<string, Date | null>();
  workTasks.forEach(task => {
    if (task.property_number) {
      map.set(task.property_number, parseDate(task.publish_scheduled_date));
    }
  });
  return map;
};

// 物件のステータスを計算
export const calculatePropertyStatus = (
  listing: PropertyListing,
  workTaskMap?: Map<string, Date | null>
): { key: string; label: string; color: string } => {
  const today = getToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 1. 報告日が今日以前で未報告
  const reportDate = parseDate(listing.report_date);
  if (reportDate && reportDate <= today) {
    const assignee = listing.report_assignee || '';
    return {
      key: 'unreported',
      label: `未報告${assignee}`,
      color: '#f44336'
    };
  }

  // 2. 確認が「未」
  if (listing.confirmation === '未') {
    return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'incomplete')!;
  }

  // 3. 一般媒介非公開（仮）が「非公開予定」
  if (listing.general_mediation_private === '非公開予定') {
    return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'private_pending')!;
  }

  // 4. １社掲載が「未確認」
  if (listing.single_listing === '未確認') {
    return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'general_listing_unconfirmed')!;
  }

  const atbbStatus = listing.atbb_status || '';
  const isPrePublish = atbbStatus.includes('公開前');
  const isGeneralPublic = atbbStatus === '一般・公開中';
  const isExclusivePublic = atbbStatus === '専任・公開中';
  const isPublic = isGeneralPublic || isExclusivePublic;

  // 5. 公開前で、業務依頼の公開予定日が今日以前 → 本日公開予定
  if (isPrePublish && workTaskMap) {
    const pubDate = workTaskMap.get(listing.property_number);
    if (pubDate && pubDate <= today) {
      return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'today_publish')!;
    }
  }

  // 6. 公開中で、公開予定日が昨日以前、Suumo URLが空、Suumo登録が「S不要」でない
  if (isPublic && workTaskMap) {
    const pubDate = workTaskMap.get(listing.property_number);
    if (pubDate && pubDate <= yesterday && !listing.suumo_url && listing.suumo_registered !== 'S不要') {
      if (isGeneralPublic) {
        return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'suumo_required')!;
      } else {
        return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'reins_suumo_required')!;
      }
    }
  }

  // 7. 買付申込み（内覧なし）の条件
  const offerStatus = listing.offer_status || '';
  const offerConditions = [
    { offer: '専任片手', atbb: '専任・公開中' },
    { offer: '一般他決', atbb: '一般・公開中' },
    { offer: '専任両手', atbb: '専任・公開中' },
    { offer: '一般両手', atbb: '一般・公開中' },
    { offer: '一般片手', atbb: '一般・公開中' },
  ];
  if (offerConditions.some(c => offerStatus === c.offer && atbbStatus === c.atbb)) {
    return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'offer_no_viewing')!;
  }

  // 8. 公開前情報
  if (atbbStatus === '一般・公開前' || atbbStatus === '専任・公開前') {
    return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'pre_publish')!;
  }

  // 9. 非公開（配信メールのみ）
  if (atbbStatus === '非公開（配信メールのみ）') {
    return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'private_email_only')!;
  }

  // 10. 一般公開中物件
  if (isGeneralPublic) {
    return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'general_public')!;
  }

  // 11. 専任公開中（担当者別）
  if (isExclusivePublic) {
    const assignee = listing.sales_assignee || '';
    const assigneeMap: Record<string, string> = {
      '山本': 'exclusive_y',
      '生野': 'exclusive_ikuno',
      '久': 'exclusive_hisa',
      '裏': 'exclusive_u',
      '林': 'exclusive_hayashi',
      '国広': 'exclusive_k',
      '木村': 'exclusive_r',
      '角井': 'exclusive_i',
    };
    const statusKey = assigneeMap[assignee];
    if (statusKey) {
      return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === statusKey)!;
    }
  }

  // デフォルト
  return PROPERTY_STATUS_DEFINITIONS.find(s => s.key === 'other')!;
};

// 全物件のステータス別カウントを計算
export const calculateStatusCounts = (
  listings: PropertyListing[],
  workTaskMap?: Map<string, Date | null>
): Record<string, number> => {
  const counts: Record<string, number> = { all: listings.length };
  
  listings.forEach(listing => {
    const status = calculatePropertyStatus(listing, workTaskMap);
    counts[status.key] = (counts[status.key] || 0) + 1;
  });

  return counts;
};

// ステータスでフィルタリング
export const filterByStatus = (
  listings: PropertyListing[],
  statusKey: string | null,
  workTaskMap?: Map<string, Date | null>
): PropertyListing[] => {
  if (!statusKey || statusKey === 'all') return listings;
  
  return listings.filter(listing => {
    const status = calculatePropertyStatus(listing, workTaskMap);
    return status.key === statusKey;
  });
};
