/**
 * 買主詳細ページのフィールド選択肢定義
 * 表記・順序は完全一致、変更不可
 */

// 他気になる物件ヒアリング
export const OTHER_PROPERTY_HEARING_OPTIONS = [
  { value: '', label: '（空欄）' },
  { value: '済', label: '済' },
  { value: '未（再度電話したが連絡取れず）', label: '未（再度電話したが連絡取れず）' },
  { value: '確認方法', label: '確認方法' },
];

// 内覧促進メール不要
export const VIEWING_PROMOTION_EMAIL_OPTIONS = [
  { value: '', label: '（空欄）' },
  { value: '不要', label: '不要' },
];

// メアド確認
export const EMAIL_CONFIRMATION_OPTIONS = [
  { value: '', label: '（空欄）' },
  { value: '確認OK', label: '確認OK' },
  { value: '断られる（orもっていない）', label: '断られる（orもっていない）' },
  { value: '未確認', label: '未確認' },
  { value: '過去記録あり', label: '過去記録あり' },
];

// Pinrich
export const PINRICH_OPTIONS = [
  { value: '', label: '（空欄）' },
  { value: '配信中', label: '配信中' },
  { value: 'クローズ', label: 'クローズ' },
  { value: '登録不要（不可）', label: '登録不要（不可）' },
  { value: '500万以上の設定済み', label: '500万以上の設定済み' },
  { value: '配信拒否（顧客より）', label: '配信拒否（顧客より）' },
  { value: '登録無し', label: '登録無し' },
  { value: '2件目以降', label: '2件目以降' },
  { value: '受信エラー', label: '受信エラー' },
];

// 内覧未確定
export const VIEWING_UNCONFIRMED_OPTIONS = [
  { value: '未確定', label: '未確定' },
];

// 画像チャット送信
export const IMAGE_CHAT_SENT_OPTIONS = [
  { value: 'Y(送信１）', label: 'Y(送信１）' },
  { value: 'N(送信２）', label: 'N(送信２）' },
];

// 仮審査
export const PRELIMINARY_SCREENING_OPTIONS = [
  { value: '', label: '（空欄）' },
  { value: '済', label: '済' },
  { value: '未（近日中）', label: '未（近日中）' },
  { value: '未', label: '未' },
];

// 現住居
export const CURRENT_RESIDENCE_OPTIONS = [
  { value: '', label: '（空欄）' },
  { value: '持家（戸建）', label: '持家（戸建）' },
  { value: '借家', label: '借家' },
  { value: '持家（マンション）', label: '持家（マンション）' },
  { value: '不明', label: '不明' },
];
