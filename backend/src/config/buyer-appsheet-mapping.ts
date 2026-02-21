/**
 * AppSheetカラム名とデータベースカラム名のマッピング
 * 
 * このマッピングは、AppSheetのIFSロジックで使用されているカラム名を
 * データベースのカラム名に変換するために使用されます。
 */

export const APPSHEET_TO_DB_MAPPING: Record<string, string> = {
  // 基本情報
  '買主番号': 'buyer_number',
  '●氏名・会社名': 'name',
  '●電話番号': 'phone_number',
  '●メアド': 'email',
  
  // 日付
  '受付日': 'reception_date',
  '●内覧日(最新）': 'latest_viewing_date',
  '★次電日': 'next_call_date',
  
  // 担当者
  '後続担当': 'follow_up_assignee',
  '初動担当': 'initial_assignee',
  
  // ステータス
  '★最新状況': 'latest_status',
  '●問合時確度': 'inquiry_confidence',
  
  // 問い合わせ
  '【問合メール】電話対応': 'inquiry_email_phone',
  '【問合メール】メール返信': 'inquiry_email_reply',
  '3回架電確認済み': 'three_calls_confirmed',
  '業者問合せ': 'broker_inquiry',
  '●問合せ元': 'inquiry_source',
  
  // 内覧
  '★内覧結果・後続対応': 'viewing_result_follow_up',
  '内覧未確定': 'viewing_unconfirmed',
  '内覧形態_一般媒介': 'viewing_type_general',
  '内覧後売主連絡': 'post_viewing_seller_contact',
  '通知送信者': 'notification_sender',
  
  // アンケート
  '査定アンケート': 'valuation_survey',
  '査定アンケート確認': 'valuation_survey_confirmed',
  '業者向けアンケート': 'broker_survey',
  
  // その他
  '曜日': 'day_of_week',
  'Pinrich': 'pinrich',
  'メアド確認': 'email_confirmation',
  'メアド確認メール担当': 'email_confirmation_assignee',
  '内覧促進メール不要': 'viewing_promotion_not_needed',
  '内覧促進メール送信者': 'viewing_promotion_sender',
  '過去買主リスト': 'past_buyer_list',
  '価格': 'price',
};

/**
 * データベースカラム名からAppSheetカラム名への逆マッピング
 */
export const DB_TO_APPSHEET_MAPPING: Record<string, string> = Object.entries(
  APPSHEET_TO_DB_MAPPING
).reduce((acc, [appsheet, db]) => {
  acc[db] = appsheet;
  return acc;
}, {} as Record<string, string>);

/**
 * AppSheetカラム名をデータベースカラム名に変換
 * @param appSheetColumnName AppSheetのカラム名
 * @returns データベースのカラム名、見つからない場合はnull
 */
export function mapAppSheetToDb(appSheetColumnName: string): string | null {
  return APPSHEET_TO_DB_MAPPING[appSheetColumnName] || null;
}

/**
 * データベースカラム名をAppSheetカラム名に変換
 * @param dbColumnName データベースのカラム名
 * @returns AppSheetのカラム名、見つからない場合はnull
 */
export function mapDbToAppSheet(dbColumnName: string): string | null {
  return DB_TO_APPSHEET_MAPPING[dbColumnName] || null;
}
