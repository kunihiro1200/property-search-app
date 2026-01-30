/**
 * Seller Status Filter Utility Functions
 * 
 * 売主リストのサイドバーステータスフィルター用のユーティリティ関数
 * 
 * 【サイドバーステータス定義】
 * 
 * 1. 「当日TEL分」
 *    - 条件: 状況（当社）に「追客中」が含まれる AND 次電日が今日以前
 *    - 追加条件: コミュニケーション情報（連絡方法/連絡取りやすい時間/電話担当）が**全て空**
 *    - 表示: コミュニケーション情報が全て空の売主のみ
 * 
 * 2. 「当日TEL（内容）」
 *    - 条件: 状況（当社）に「追客中」が含まれる AND 次電日が今日以前
 *    - 追加条件: コミュニケーション情報のいずれかに入力がある
 *    - 表示: 当日TEL(Eメール)、当日TEL(Y)など、内容付きで表示
 *    - 例: AA13489（Eメール）、AA13507（Y）
 * 
 * 3. 「未査定」
 *    - 条件: 査定額1,2,3が全て空 AND 反響日付が2025/12/8以降 AND 営担が空
 * 
 * 4. 「査定（郵送）」
 *    - 条件: 郵送ステータスが「未」
 * 
 * Requirements:
 * - 1.2: 当日TEL フィルター（コミュニケーション情報なし）
 * - 1.3: 当日TEL（内容）フィルター（コミュニケーション情報あり）
 * - 2.2: 未査定 フィルター
 * - 3.2: 査定（郵送） フィルター
 */

import { Seller } from '../types';

// ステータスカテゴリの型定義
// todayCall: コミュニケーション情報が全て空の当日TEL
// todayCallWithInfo: コミュニケーション情報のいずれかに入力がある当日TEL
export type StatusCategory = 'all' | 'todayCall' | 'todayCallWithInfo' | 'unvaluated' | 'mailingPending';

// カテゴリカウントのインターフェース
export interface CategoryCounts {
  all: number;
  todayCall: number;           // 当日TEL分（コミュニケーション情報なし）
  todayCallWithInfo: number;   // 当日TEL（内容）（コミュニケーション情報あり）
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
    // "2026/1/27" 形式または "2026-01-27" 形式をパース
    if (typeof dateStr === 'string') {
      const parts = dateStr.includes('/') 
        ? dateStr.split('/') 
        : dateStr.split('-');
      
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const date = new Date(year, month, day);
          date.setHours(0, 0, 0, 0);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  } catch {
    return null;
  }
};

/**
 * 日本時間（JST）で今日の日付を取得
 */
const getTodayJST = (): Date => {
  const now = new Date();
  const jstOffset = 9 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jstTime = new Date(utcTime + (jstOffset * 60000));
  jstTime.setHours(0, 0, 0, 0);
  return jstTime;
};

/**
 * 日付が今日以前かどうかを判定
 */
const isTodayOrBefore = (dateStr: string | Date | undefined | null): boolean => {
  const date = safeParseDate(dateStr);
  if (!date) return false;
  
  const today = getTodayJST();
  return date.getTime() <= today.getTime();
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
 * 当日TELの共通条件を判定
 * 
 * 共通条件:
 * - 状況（当社）に「追客中」が含まれる
 * - 次電日が今日以前
 * 
 * @param seller 売主データ
 * @returns 当日TELの共通条件を満たすかどうか
 */
const isTodayCallBase = (seller: Seller | any): boolean => {
  // ステータスが追客中かチェック（状況（当社）に「追客中」が含まれる）
  const status = seller.status || seller.situation_company || '';
  const isFollowingUp = typeof status === 'string' && status.includes('追客中');
  
  // 次電日が今日以前かチェック
  const nextCallDate = seller.nextCallDate || seller.next_call_date;
  const isNextCallTodayOrBefore = isTodayOrBefore(nextCallDate);
  
  // デバッグログ（最初の5件のみ）
  if (seller.sellerNumber && (seller.sellerNumber.includes('AA13507') || seller.sellerNumber.includes('AA13489'))) {
    console.log(`=== isTodayCallBase: ${seller.sellerNumber} ===`);
    console.log('status:', status);
    console.log('isFollowingUp:', isFollowingUp);
    console.log('nextCallDate:', nextCallDate);
    console.log('isNextCallTodayOrBefore:', isNextCallTodayOrBefore);
  }
  
  if (!isFollowingUp) {
    return false;
  }
  
  return isNextCallTodayOrBefore;
};

/**
 * コミュニケーション情報があるかどうかを判定
 * 
 * コミュニケーション情報の3つのフィールド:
 * 1. 連絡方法 (contact_method)
 * 2. 連絡取りやすい時間 (preferred_contact_time)
 * 3. 電話担当 (phone_contact_person)
 * 
 * @param seller 売主データ
 * @returns コミュニケーション情報のいずれかに入力があるかどうか
 */
const hasContactInfo = (seller: Seller | any): boolean => {
  const contactMethod = seller.contactMethod || seller.contact_method || '';
  const preferredContactTime = seller.preferredContactTime || seller.preferred_contact_time || '';
  const phoneContactPerson = seller.phoneContactPerson || seller.phone_contact_person || '';
  
  return (
    (contactMethod && contactMethod.trim() !== '') ||
    (preferredContactTime && preferredContactTime.trim() !== '') ||
    (phoneContactPerson && phoneContactPerson.trim() !== '')
  );
};

/**
 * 当日TEL分判定（コミュニケーション情報が全て空の売主のみ）
 * 
 * 【サイドバー表示】「当日TEL分」
 * 
 * 条件:
 * - 状況（当社）に「追客中」が含まれる
 * - 次電日が今日以前
 * - コミュニケーション情報（連絡方法/連絡取りやすい時間/電話担当）が**全て空**
 * 
 * 注意: コミュニケーション情報のいずれかに入力がある売主は
 * 「当日TEL分」としてカウントしない → 「当日TEL（内容）」に分類される
 * 
 * @param seller 売主データ
 * @returns 当日TEL分対象かどうか
 * 
 * Requirements: 1.2
 */
export const isTodayCall = (seller: Seller | any): boolean => {
  // 共通条件をチェック
  if (!isTodayCallBase(seller)) {
    return false;
  }
  
  // コミュニケーション情報が全て空の場合のみ「当日TEL分」としてカウント
  return !hasContactInfo(seller);
};

/**
 * 当日TEL（内容）判定（コミュニケーション情報のいずれかに入力がある売主）
 * 
 * 【サイドバー表示】「当日TEL（内容）」
 * 
 * 条件:
 * - 状況（当社）に「追客中」が含まれる
 * - 次電日が今日以前
 * - コミュニケーション情報（連絡方法/連絡取りやすい時間/電話担当）の**いずれかに入力がある**
 * 
 * 例:
 * - AA13489: contact_method = "Eメール" → 当日TEL(Eメール)
 * - AA13507: phone_contact_person = "Y" → 当日TEL(Y)
 * 
 * @param seller 売主データ
 * @returns 当日TEL（内容）対象かどうか
 * 
 * Requirements: 1.3
 */
export const isTodayCallWithInfo = (seller: Seller | any): boolean => {
  // 共通条件をチェック
  if (!isTodayCallBase(seller)) {
    return false;
  }
  
  // コミュニケーション情報のいずれかに入力がある場合「当日TEL（内容）」としてカウント
  return hasContactInfo(seller);
};

/**
 * 当日TEL（内容）の表示ラベルを取得
 * 
 * コミュニケーション情報の優先順位:
 * 1. 連絡方法 (contact_method) → 当日TEL(Eメール)
 * 2. 連絡取りやすい時間 (preferred_contact_time) → 当日TEL(午前中)
 * 3. 電話担当 (phone_contact_person) → 当日TEL(Y)
 * 
 * @param seller 売主データ
 * @returns 表示ラベル（例: "当日TEL(Eメール)"）
 */
export const getTodayCallWithInfoLabel = (seller: Seller | any): string => {
  const contactMethod = seller.contactMethod || seller.contact_method || '';
  const preferredContactTime = seller.preferredContactTime || seller.preferred_contact_time || '';
  const phoneContactPerson = seller.phoneContactPerson || seller.phone_contact_person || '';
  
  // 優先順位: 連絡方法 > 連絡取りやすい時間 > 電話担当
  if (contactMethod && contactMethod.trim() !== '') {
    return `当日TEL(${contactMethod})`;
  }
  if (preferredContactTime && preferredContactTime.trim() !== '') {
    return `当日TEL(${preferredContactTime})`;
  }
  if (phoneContactPerson && phoneContactPerson.trim() !== '') {
    return `当日TEL(${phoneContactPerson})`;
  }
  
  return '当日TEL（内容）';
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
    todayCallWithInfo: sellers.filter(isTodayCallWithInfo).length,
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
    case 'todayCallWithInfo':
      return sellers.filter(isTodayCallWithInfo);
    case 'unvaluated':
      return sellers.filter(isUnvaluated);
    case 'mailingPending':
      return sellers.filter(isMailingPending);
    case 'all':
    default:
      return sellers;
  }
};
