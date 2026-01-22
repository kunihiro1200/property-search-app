/**
 * 物件ステータスユーティリティ関数
 * 
 * 物件のatbb_statusからバッジタイプを判定する共通関数を提供します。
 * PublicPropertyCardとPublicPropertyHeaderで共通使用されます。
 */

/**
 * バッジタイプ
 * - 'none': バッジを表示しない（公開中の物件）
 * - 'sold': 「成約済み」バッジを表示
 * - 'pre_release': 「公開前」バッジを表示
 * - 'email_only': 「配信限定」バッジを表示
 */
export type BadgeType = 'none' | 'sold' | 'pre_release' | 'email_only';

/**
 * atbb_statusからバッジタイプを判定する
 * 
 * @param atbbStatus - 物件のatbb_status値
 * @returns バッジタイプ
 * 
 * @example
 * getBadgeType('専任・公開中') // => 'none'
 * getBadgeType('公開前') // => 'pre_release'
 * getBadgeType('非公開（配信メールのみ）') // => 'email_only'
 * getBadgeType('非公開案件') // => 'sold'
 * getBadgeType(null) // => 'sold'
 */
export function getBadgeType(atbbStatus: string | null | undefined): BadgeType {
  // null、undefined、空文字列の場合は'sold'を返す（安全側に倒す）
  if (!atbbStatus) {
    return 'sold';
  }

  // 「公開中」を含む場合はバッジを表示しない
  if (atbbStatus.includes('公開中')) {
    return 'none';
  }

  // 「公開前」を含む場合は「公開前」バッジを表示
  if (atbbStatus.includes('公開前')) {
    return 'pre_release';
  }

  // 「非公開」を含み、かつ「配信メール」を含む場合は「配信限定」バッジを表示
  if (atbbStatus.includes('非公開') && atbbStatus.includes('配信メール')) {
    return 'email_only';
  }

  // 「非公開」を含み、かつ「配信メール」を含まない場合は「成約済み」バッジを表示
  if (atbbStatus.includes('非公開')) {
    return 'sold';
  }

  // その他すべての場合は「成約済み」バッジを表示
  return 'sold';
}

/**
 * バッジ設定
 */
export interface BadgeConfig {
  text: string;
  color: string;
}

/**
 * バッジタイプごとの設定
 * 一覧画面（PublicPropertyCard）と同じ色を使用
 */
export const BADGE_CONFIG: Record<Exclude<BadgeType, 'none'>, BadgeConfig> = {
  sold: {
    text: '成約済み',
    color: 'rgba(0, 0, 0, 0.8)', // 黒色（一覧画面と同じ）
  },
  pre_release: {
    text: '公開前',
    color: 'rgba(255, 152, 0, 0.9)', // オレンジ色（一覧画面と同じ）
  },
  email_only: {
    text: '配信限定',
    color: 'rgba(33, 150, 243, 0.9)', // 青色（一覧画面と同じ）
  },
};

/**
 * 物件がクリック可能かどうかを判定する
 * 
 * @param atbbStatus - 物件のatbb_status値
 * @returns クリック可能な場合はtrue、そうでない場合はfalse
 * 
 * @example
 * isPropertyClickable('専任・公開中') // => true
 * isPropertyClickable('一般・公開中') // => true
 * isPropertyClickable('非公開（配信メールのみ）') // => true
 * isPropertyClickable('公開前') // => false
 * isPropertyClickable('非公開案件') // => false
 */
export function isPropertyClickable(atbbStatus: string | null | undefined): boolean {
  // null、undefined、空文字列の場合はクリック不可
  if (!atbbStatus) {
    return false;
  }

  // 「公開中」を含む場合はクリック可能
  if (atbbStatus.includes('公開中')) {
    return true;
  }

  // 「非公開（配信メールのみ）」の場合はクリック可能
  if (atbbStatus.includes('非公開') && atbbStatus.includes('配信メール')) {
    return true;
  }

  // その他の場合はクリック不可
  return false;
}
