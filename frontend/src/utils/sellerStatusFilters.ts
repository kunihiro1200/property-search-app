/**
 * Seller Status Filter Utility Functions
 * 
 * 売主リストのサイドバーステータスフィルター用のユーティリティ関数
 * 
 * Requirements:
 * - 1.2: 当日TEL フィルター
 * - 2.2: 未査定 フィルター
 * - 3.2: 査定（郵送） フィルター
 */

import { Seller } from '../types';

// ステータスカテゴリの型定義
export type StatusCategory = 'all' | 'todayCall' | 'unvaluated' | 'mailingPending';

// カテゴリカウントのインターフェース
export interface CategoryCounts {
  all: number;
  todayCall: number;
  unvaluated: number;
  mailingPending: number;
}

/**
 * 安全な日付比較ヘルパー関数
 * 無効な日付の場合はfalseを返す
 */
const safeParseDate = (dateStr: string | Date | undefined | null): Date | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
};

/**
 * 日付が今日かどうかを判定
 */
const isToday = (dateStr: string | Date | undefined | null): boolean => {
  const date = safeParseDate(dateStr);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return today.getTime() === date.getTime();
};

/**
 * 日付が指定日以降かどうかを判定
 */
const isOnOrAfter = (dateStr: string | Date | undefined | null, targetDate: Date): boolean => {
  const date = safeParseDate(dateStr);
  if (!date) return false;
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date.getTime() >= target.getTime();
};

/**
 * ステータスが「追客中」かどうかを判定
 * 英語のenum値と日本語の値の両方に対応
 */
const isFollowingUpStatus = (status: string | undefined | null): boolean => {
  if (!status) return false;
  
  // 英語のenum値
  if (status === 'following_up') return true;
  
  // 日本語の値（部分一致）
  if (status.includes('追客')) return true;
  
  return false;
};

/**
 * 当日TEL判定
 * 
 * 条件:
 * - 次電日が当日
 * - 状況（当社）が「追客中」または「following_up」
 * - 営担（visitAssignee）が空欄
 * 
 * @param seller 売主データ
 * @returns 当日TEL対象かどうか
 * 
 * Requirements: 1.2
 */
export const isTodayCall = (seller: Seller | any): boolean => {
  // 次電日が当日かチェック
  if (!isToday(seller.nextCallDate)) {
    return false;
  }
  
  // ステータスが追客中かチェック
  if (!isFollowingUpStatus(seller.status)) {
    return false;
  }
  
  // 営担が空欄かチェック
  const hasNoAssignee = !seller.visitAssignee || 
                        (typeof seller.visitAssignee === 'string' && seller.visitAssignee.trim() === '');
  
  return hasNoAssignee;
};

/**
 * 査定不要かどうかを判定
 * 郵送ステータスが「不要」の場合は査定不要とみなす
 */
const isValuationNotRequired = (seller: Seller | any): boolean => {
  // mailingStatusが「不要」の場合は査定不要
  if (seller.mailingStatus === '不要') return true;
  
  // 他の査定不要条件があればここに追加
  // 例: seller.valuationNotRequired === true
  
  return false;
};

/**
 * 未査定判定
 * 
 * 条件:
 * - 査定額1, 2, 3が全て空欄（null, undefined, 0）
 * - 反響日付が2025/12/8以降
 * - 査定不要ではない
 * - 営担（visitAssignee）が空欄
 * 
 * @param seller 売主データ
 * @returns 未査定対象かどうか
 * 
 * Requirements: 2.2
 */
export const isUnvaluated = (seller: Seller | any): boolean => {
  // 未査定の基準日
  const CUTOFF_DATE = new Date('2025-12-08');
  
  // 査定不要の場合は未査定として表示しない
  if (isValuationNotRequired(seller)) {
    return false;
  }
  
  // 営担に値がある場合は未査定として表示しない
  const hasAssignee = seller.visitAssignee && 
                      typeof seller.visitAssignee === 'string' && 
                      seller.visitAssignee.trim() !== '';
  if (hasAssignee) {
    return false;
  }
  
  // 査定額が全て空欄かチェック
  const hasNoValuation = !seller.valuationAmount1 && 
                         !seller.valuationAmount2 && 
                         !seller.valuationAmount3;
  
  if (!hasNoValuation) {
    return false;
  }
  
  // 反響日付が基準日以降かチェック
  // inquiryDateまたはinquiryDetailedDatetimeを使用
  const inquiryDate = seller.inquiryDetailedDatetime || seller.inquiryDate;
  
  return isOnOrAfter(inquiryDate, CUTOFF_DATE);
};

/**
 * 査定（郵送）判定
 * 
 * 条件:
 * - 郵送ステータス（mailingStatus）が「未」
 * 
 * @param seller 売主データ
 * @returns 査定（郵送）対象かどうか
 * 
 * Requirements: 3.2
 */
export const isMailingPending = (seller: Seller | any): boolean => {
  return seller.mailingStatus === '未';
};

/**
 * カテゴリ別の売主数をカウント
 * 
 * @param sellers 売主リスト
 * @returns 各カテゴリの件数
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export const getCategoryCounts = (sellers: (Seller | any)[]): CategoryCounts => {
  return {
    all: sellers.length,
    todayCall: sellers.filter(isTodayCall).length,
    unvaluated: sellers.filter(isUnvaluated).length,
    mailingPending: sellers.filter(isMailingPending).length,
  };
};

/**
 * カテゴリ別にフィルタリング
 * 
 * @param sellers 売主リスト
 * @param category 選択されたカテゴリ
 * @returns フィルタリングされた売主リスト
 * 
 * Requirements: 1.3, 2.3, 3.3, 5.2
 */
export const filterSellersByCategory = (
  sellers: (Seller | any)[],
  category: StatusCategory
): (Seller | any)[] => {
  switch (category) {
    case 'todayCall':
      return sellers.filter(isTodayCall);
    case 'unvaluated':
      return sellers.filter(isUnvaluated);
    case 'mailingPending':
      return sellers.filter(isMailingPending);
    case 'all':
    default:
      return sellers;
  }
};
