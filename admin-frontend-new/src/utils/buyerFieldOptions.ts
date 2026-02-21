/**
 * 買主詳細ページの各種ドロップダウンフィールドの選択肢定義
 * 
 * 以下のフィールドで使用:
 * - 【問合メール】電話対応 (inquiry_email_phone)
 * - 3回架電確認済み (three_calls_confirmed)
 * - メール種別 (email_type)
 * - 配信種別 (distribution_type)
 */

export interface FieldOption {
  value: string;
  label: string;
}

/**
 * 【問合メール】電話対応の選択肢
 */
export const INQUIRY_EMAIL_PHONE_OPTIONS: FieldOption[] = [
  { value: '済', label: '済' },
  { value: '未', label: '未' },
  { value: '不通', label: '不通' },
  { value: '電話番号なし', label: '電話番号なし' },
  { value: '不要', label: '不要' },
];

/**
 * 3回架電確認済みの選択肢
 */
export const THREE_CALLS_CONFIRMED_OPTIONS: FieldOption[] = [
  { value: '3回架電OK', label: '3回架電OK' },
  { value: '3回架電未', label: '3回架電未' },
  { value: '他', label: '他' },
];

/**
 * メール種別の選択肢
 */
export const EMAIL_TYPE_OPTIONS: FieldOption[] = [
  { value: 'メールアドレス確認', label: 'メールアドレス確認' },
  { value: '資料請求メール（戸、マ）', label: '資料請求メール（戸、マ）' },
  { value: '資料請求メール（土）許可不要', label: '資料請求メール（土）許可不要' },
  { value: '資料請求メール（土）売主へ要許可', label: '資料請求メール（土）売主へ要許可' },
  { value: '買付あり内覧NG', label: '買付あり内覧NG' },
  { value: '買付あり内覧OK', label: '買付あり内覧OK' },
  { value: '前回問合せ後反応なし', label: '前回問合せ後反応なし' },
  { value: '前回問合せ後反応なし（買付あり、物件不適合）', label: '前回問合せ後反応なし（買付あり、物件不適合）' },
  { value: '物件指定なし問合せ（Pinrich)', label: '物件指定なし問合せ（Pinrich)' },
  { value: '民泊問合せ', label: '民泊問合せ' },
];

/**
 * 配信種別の選択肢
 */
export const DISTRIBUTION_TYPE_OPTIONS: FieldOption[] = [
  { value: '要', label: '要' },
  { value: '不要', label: '不要' },
];
