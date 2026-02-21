/**
 * ATBB_Statusの表示ステータス変換ユーティリティ
 * 
 * 物件リストの「atbb成約済み/非公開」カラムの値を
 * ユーザーフレンドリーなステータス表示に変換する
 */

/**
 * ステータスの種類
 */
export type StatusType = 'pre_publish' | 'private' | 'sold' | 'other';

/**
 * 表示ステータスの結果インターフェース
 */
export interface DisplayStatusResult {
  /** 表示用ステータス */
  displayStatus: string;
  /** 元のステータス */
  originalStatus: string;
  /** ステータスの種類（フィルタリング用） */
  statusType: StatusType;
}

/**
 * ATBB_Statusを表示用ステータスに変換する
 * 
 * 優先順位:
 * 1. 「公開前」を含む → 「公開前情報」
 * 2. 「配信メールのみ」を含む → 「非公開物件」
 * 3. 「非公開」を含む（「配信メール」を含まない） → 「成約済み」
 * 4. 上記以外 → 元の値をそのまま表示
 * 
 * @param atbbStatus - ATBB_Statusの値
 * @returns DisplayStatusResult - 変換結果
 */
export function mapAtbbStatusToDisplayStatus(
  atbbStatus: string | null | undefined
): DisplayStatusResult {
  // null、undefined、空文字列の場合は空文字列を返す
  if (atbbStatus === null || atbbStatus === undefined || atbbStatus === '') {
    return {
      displayStatus: '',
      originalStatus: '',
      statusType: 'other'
    };
  }

  const originalStatus = atbbStatus;

  // 優先度1: 「公開前」を含む → 「公開前情報」
  if (atbbStatus.includes('公開前')) {
    return {
      displayStatus: '公開前情報',
      originalStatus,
      statusType: 'pre_publish'
    };
  }

  // 優先度2: 「配信メールのみ」を含む → 「非公開物件」
  if (atbbStatus.includes('配信メールのみ')) {
    return {
      displayStatus: '非公開物件',
      originalStatus,
      statusType: 'private'
    };
  }

  // 優先度3: 「非公開」を含む（「配信メール」を含まない） → 「成約済み」
  if (atbbStatus.includes('非公開') && !atbbStatus.includes('配信メール')) {
    return {
      displayStatus: '成約済み',
      originalStatus,
      statusType: 'sold'
    };
  }

  // 優先度4: 上記以外 → 元の値をそのまま表示
  return {
    displayStatus: originalStatus,
    originalStatus,
    statusType: 'other'
  };
}

/**
 * 表示ステータスのみを取得するヘルパー関数
 * 
 * @param atbbStatus - ATBB_Statusの値
 * @returns string - 表示用ステータス文字列
 */
export function getDisplayStatus(atbbStatus: string | null | undefined): string {
  return mapAtbbStatusToDisplayStatus(atbbStatus).displayStatus;
}
