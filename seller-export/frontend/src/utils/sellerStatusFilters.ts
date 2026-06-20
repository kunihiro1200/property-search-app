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
// todayCall: コミュニケーション情報が全て空の当日TEL（営担なし）
// todayCallWithInfo: コミュニケーション情報のいずれかに入力がある当日TEL（営担なし）
// todayCallAssigned: 営担あり + 訪問日なし + 次電日が今日以前
// visitScheduled: 訪問予定（営担に入力あり、訪問日が今日以降）
// visitCompleted: 訪問済み（営担に入力あり、訪問日が昨日以前）
// todayCallNotStarted: 当日TEL_未着手（不通が空欄 + 反響日付が2026/1/1以降）
// pinrichEmpty: Pinrich空欄（Pinrichカラムが空欄）
export type StatusCategory = 'all' | 'todayCall' | 'todayCallWithInfo' | 'todayCallAssigned' | 'visitScheduled' | 'visitCompleted' | 'unvaluated' | 'mailingPending' | 'todayCallNotStarted' | 'pinrichEmpty';

// カテゴリカウントのインターフェース
export interface CategoryCounts {
  all: number;
  todayCall: number;           // 当日TEL分（コミュニケーション情報なし、営担なし）
  todayCallWithInfo: number;   // 当日TEL（内容）（コミュニケーション情報あり、営担なし）
  todayCallAssigned: number;   // 当日TEL（担当）（営担あり、訪問日なし、次電日が今日以前）
  visitScheduled: number;      // 訪問予定（営担に入力あり、訪問日が今日以降）
  visitCompleted: number;      // 訪問済み（営担に入力あり、訪問日が昨日以前）
  unvaluated: number;
  mailingPending: number;
  todayCallNotStarted: number; // 当日TEL_未着手（不通が空欄 + 反響日付が2026/1/1以降）
  pinrichEmpty: number;        // Pinrich空欄（Pinrichカラムが空欄）
}

/**
 * 日本時間（JST）で今日の日付文字列を取得（YYYY-MM-DD形式）
 * タイムゾーンに依存しない日付比較のため、文字列で比較する
 */
const getTodayJSTString = (): string => {
  const now = new Date();
  // UTCに変換してから9時間足してJSTにする
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 日付文字列を正規化（YYYY-MM-DD形式に変換）
 * タイムゾーンに依存しない日付比較のため
 */
const normalizeDateString = (dateStr: string | Date | undefined | null): string | null => {
  if (!dateStr) return null;
  
  try {
    let dateString: string;
    
    if (dateStr instanceof Date) {
      // Dateオブジェクトの場合、ローカル日付を取得
      const year = dateStr.getFullYear();
      const month = String(dateStr.getMonth() + 1).padStart(2, '0');
      const day = String(dateStr.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    } else {
      dateString = dateStr;
    }
    
    // "2026/1/27" 形式を "2026-01-27" 形式に変換
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    // "2026-01-27" 形式の場合、日付部分のみ抽出
    if (dateString.includes('-')) {
      const datePart = dateString.split('T')[0]; // ISO形式の場合、日付部分のみ
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * 安全な日付比較ヘルパー関数（後方互換性のため残す）
 * 無効な日付の場合はnullを返す
 */
const safeParseDate = (dateStr: string | Date | undefined | null): Date | null => {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return null;
  
  const parts = normalized.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * 日本時間（JST）で今日の日付を取得（後方互換性のため残す）
 */
const getTodayJST = (): Date => {
  const todayStr = getTodayJSTString();
  const parts = todayStr.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * 日付が今日以前かどうかを判定（JST基準、文字列比較）
 * タイムゾーンに依存しない正確な比較
 */
const isTodayOrBefore = (dateStr: string | Date | undefined | null): boolean => {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return false;
  
  const todayStr = getTodayJSTString();
  // 文字列比較（YYYY-MM-DD形式なので辞書順で比較可能）
  return normalized <= todayStr;
};

/**
 * 日付が昨日以前かどうかを判定（JST基準、文字列比較）
 * タイムゾーンに依存しない正確な比較
 */
const isYesterdayOrBefore = (dateStr: string | Date | undefined | null): boolean => {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return false;
  
  const todayStr = getTodayJSTString();
  // 文字列比較（YYYY-MM-DD形式なので辞書順で比較可能）
  // 昨日以前 = 今日より前
  return normalized < todayStr;
};

/**
 * 営担（visitAssignee）に有効な入力があるかどうかを判定
 * 「外す」は担当なしと同じ扱い
 */
const hasVisitAssignee = (seller: Seller | any): boolean => {
  const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
  // 空文字または「外す」の場合は担当なしとみなす
  if (!visitAssignee || visitAssignee.trim() === '' || visitAssignee.trim() === '外す') {
    return false;
  }
  return true;
};

/**
 * 日付が今日以降かどうかを判定（JST基準、文字列比較）
 * タイムゾーンに依存しない正確な比較
 */
const isTodayOrAfter = (dateStr: string | Date | undefined | null): boolean => {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return false;
  
  const todayStr = getTodayJSTString();
  // 文字列比較（YYYY-MM-DD形式なので辞書順で比較可能）
  return normalized >= todayStr;
};

/**
 * 訪問予定判定（営担に入力あり、訪問日が今日以降）
 * 
 * 【サイドバー表示】「訪問予定（イニシャル）」
 * 
 * 条件:
 * - 営担（visitAssignee）に入力がある
 * - 訪問日（visitDate）が今日以降
 * 
 * @param seller 売主データ
 * @returns 訪問予定対象かどうか
 */
export const isVisitScheduled = (seller: Seller | any): boolean => {
  if (!hasVisitAssignee(seller)) {
    return false;
  }
  
  const visitDate = seller.visitDate || seller.visit_date;
  if (!visitDate) {
    return false;
  }
  
  return isTodayOrAfter(visitDate);
};

/**
 * 訪問済み判定（営担に入力あり、訪問日が昨日以前）
 * 
 * 【サイドバー表示】「訪問済み（イニシャル）」
 * 
 * 条件:
 * - 営担（visitAssignee）に入力がある
 * - 訪問日（visitDate）が昨日以前
 * 
 * @param seller 売主データ
 * @returns 訪問済み対象かどうか
 */
export const isVisitCompleted = (seller: Seller | any): boolean => {
  if (!hasVisitAssignee(seller)) {
    return false;
  }
  
  const visitDate = seller.visitDate || seller.visit_date;
  if (!visitDate) {
    return false;
  }
  
  return isYesterdayOrBefore(visitDate);
};

/**
 * 訪問予定/訪問済みの表示ラベルを取得
 * 
 * @param seller 売主データ
 * @param type 'scheduled' | 'completed'
 * @returns 表示ラベル（例: "訪問予定(Y)"、"訪問済み(I)"）
 */
export const getVisitStatusLabel = (seller: Seller | any, type: 'scheduled' | 'completed'): string => {
  const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
  const prefix = type === 'scheduled' ? '訪問予定' : '訪問済み';
  
  if (visitAssignee && visitAssignee.trim() !== '') {
    return `${prefix}(${visitAssignee})`;
  }
  
  return prefix;
};

/**
 * 担当分判定（営担に入力あり、訪問日なし）
 * 
 * 【サイドバー表示】「担当分（イニシャル）」
 * 
 * 条件:
 * - 営担（visitAssignee）に入力がある
 * - 訪問日（visitDate）が空
 * 
 * @param seller 売主データ
 * @returns 担当分対象かどうか
 */
export const isAssignedNoVisitDate = (seller: Seller | any): boolean => {
  if (!hasVisitAssignee(seller)) {
    return false;
  }
  
  const visitDate = seller.visitDate || seller.visit_date;
  // 訪問日が空の場合のみ「担当分」
  return !visitDate || (typeof visitDate === 'string' && visitDate.trim() === '');
};

/**
 * 担当分の表示ラベルを取得
 * 
 * @param seller 売主データ
 * @returns 表示ラベル（例: "担当分(Y)"、"担当分(I)"）
 */
export const getAssignedNoVisitDateLabel = (seller: Seller | any): string => {
  const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
  
  if (visitAssignee && visitAssignee.trim() !== '') {
    return `担当分(${visitAssignee})`;
  }
  
  return '担当分';
};

/**
 * 当日TEL（担当）判定（営担あり + 次電日が今日以前）
 * 
 * 【サイドバー表示】「当日TEL（イニシャル）」
 * 
 * 条件:
 * - 営担（visitAssignee）に入力がある
 * - 次電日が今日以前
 * 
 * 注意: 訪問日の有無に関係なく、次電日が今日以前であれば対象
 * 
 * @param seller 売主データ
 * @returns 当日TEL（担当）対象かどうか
 */
export const isTodayCallAssigned = (seller: Seller | any): boolean => {
  // 営担がない場合は対象外
  if (!hasVisitAssignee(seller)) {
    return false;
  }
  
  // 次電日が今日以前かチェック
  const nextCallDate = seller.nextCallDate || seller.next_call_date;
  return isTodayOrBefore(nextCallDate);
};

/**
 * 当日TEL（担当）の表示ラベルを取得
 * 
 * @param seller 売主データ
 * @returns 表示ラベル（例: "当日TEL(Y)"、"当日TEL(I)"）
 */
export const getTodayCallAssignedLabel = (seller: Seller | any): string => {
  const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
  
  if (visitAssignee && visitAssignee.trim() !== '') {
    return `当日TEL(${visitAssignee})`;
  }
  
  return '当日TEL（担当）';
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
 * - 営担（visitAssignee）が空（営業担当が設定されている売主は除外）
 * 
 * 注意: コミュニケーション情報のいずれかに入力がある売主は
 * 「当日TEL分」としてカウントしない → 「当日TEL（内容）」に分類される
 * 
 * 【優先順位】
 * 1. 営担あり → 当日TEL分から除外（訪問日の有無に関係なく）
 * 2. 当日TEL分/当日TEL（内容）← 営担が空の場合のみ
 * 
 * @param seller 売主データ
 * @returns 当日TEL分対象かどうか
 * 
 * Requirements: 1.2
 */
export const isTodayCall = (seller: Seller | any): boolean => {
  // 営担に入力がある売主は当日TELから除外（訪問日の有無に関係なく）
  if (hasVisitAssignee(seller)) {
    return false;
  }
  
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
 * - 営担（visitAssignee）が空（営業担当が設定されている売主は除外）
 * 
 * 例:
 * - AA13489: contact_method = "Eメール" → 当日TEL(Eメール)
 * - AA13507: phone_contact_person = "Y" → 当日TEL(Y)
 * 
 * 【優先順位】
 * 1. 営担あり → 当日TEL（内容）から除外（訪問日の有無に関係なく）
 * 2. 当日TEL分/当日TEL（内容）← 営担が空の場合のみ
 * 
 * @param seller 売主データ
 * @returns 当日TEL（内容）対象かどうか
 * 
 * Requirements: 1.3
 */
export const isTodayCallWithInfo = (seller: Seller | any): boolean => {
  // 営担に入力がある売主は当日TELから除外（訪問日の有無に関係なく）
  if (hasVisitAssignee(seller)) {
    return false;
  }
  
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
 * - 査定額1, 2, 3が全て空欄（自動計算と手動入力の両方）
 * - 反響日付が2025/12/8以降
 * - 査定不要ではない
 * - 営担（visitAssignee）が空欄
 * - 状況（当社）に「追客中」が含まれる
 * 
 * @param seller 売主データ
 * @returns 未査定対象かどうか
 * 
 * Requirements: 2.2
 */
export const isUnvaluated = (seller: Seller | any): boolean => {
  // 未査定の基準日: 2025/12/8（文字列比較用）
  const CUTOFF_DATE_STR = '2025-12-08';
  
  // 査定不要の場合は未査定として表示しない
  if (isValuationNotRequired(seller)) {
    return false;
  }
  
  // 状況（当社）に「追客中」が含まれるかチェック
  const status = seller.status || seller.situation_company || '';
  const isFollowingUp = typeof status === 'string' && status.includes('追客中');
  if (!isFollowingUp) {
    return false;
  }
  
  // 営担に値がある場合は未査定として表示しない
  const hasAssignee = seller.visitAssignee && 
                      typeof seller.visitAssignee === 'string' && 
                      seller.visitAssignee.trim() !== '';
  if (hasAssignee) {
    return false;
  }
  
  // 査定額が全て空欄かチェック（自動計算と手動入力の両方）
  // valuationAmount1/2/3: 通常の査定額（手動入力優先、なければ自動計算）
  // manualValuationAmount1/2/3: 手動入力査定額（存在する場合）
  const hasNoValuation = !seller.valuationAmount1 && 
                         !seller.valuationAmount2 && 
                         !seller.valuationAmount3 &&
                         !seller.manualValuationAmount1 &&
                         !seller.manualValuationAmount2 &&
                         !seller.manualValuationAmount3;
  
  if (!hasNoValuation) {
    return false;
  }
  
  // 反響日付が基準日以降かチェック（文字列比較）
  // inquiryDateまたはinquiryDetailedDatetimeを使用
  const inquiryDate = seller.inquiryDetailedDatetime || seller.inquiryDate || seller.inquiry_date;
  const normalizedInquiryDate = normalizeDateString(inquiryDate);
  
  if (!normalizedInquiryDate) {
    return false;
  }
  
  return normalizedInquiryDate >= CUTOFF_DATE_STR;
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
 * 当日TEL_未着手判定
 * 
 * 条件:
 * - 不通カラム（unreachableStatus）が空欄
 * - 反響日付が2026/1/1以降
 * - 当日TEL分の条件を満たす（追客中 + 次電日が今日以前 + コミュニケーション情報が全て空 + 営担なし）
 * 
 * @param seller 売主データ
 * @returns 当日TEL_未着手対象かどうか
 */
export const isTodayCallNotStarted = (seller: Seller | any): boolean => {
  // 当日TEL分の基準日: 2026/1/1（文字列比較用）
  const CUTOFF_DATE_STR = '2026-01-01';
  
  // まず当日TEL分の条件を満たすかチェック
  if (!isTodayCall(seller)) {
    return false;
  }
  
  // 不通カラムが空欄かチェック
  const unreachableStatus = seller.unreachableStatus || seller.unreachable_status || '';
  if (unreachableStatus && unreachableStatus.trim() !== '') {
    return false;
  }
  
  // 反響日付が2026/1/1以降かチェック
  const inquiryDate = seller.inquiryDetailedDatetime || seller.inquiryDate || seller.inquiry_date;
  const normalizedInquiryDate = normalizeDateString(inquiryDate);
  
  if (!normalizedInquiryDate) {
    return false;
  }
  
  return normalizedInquiryDate >= CUTOFF_DATE_STR;
};

/**
 * Pinrich空欄判定
 * 
 * 条件:
 * - Pinrichカラム（pinrichStatus）が空欄
 * - 当日TEL分の条件を満たす（追客中 + 次電日が今日以前 + コミュニケーション情報が全て空 + 営担なし）
 * 
 * @param seller 売主データ
 * @returns Pinrich空欄対象かどうか
 */
export const isPinrichEmpty = (seller: Seller | any): boolean => {
  // まず当日TEL分の条件を満たすかチェック
  if (!isTodayCall(seller)) {
    return false;
  }
  
  // Pinrichカラムが空欄かチェック
  const pinrichStatus = seller.pinrichStatus || seller.pinrich_status || '';
  return !pinrichStatus || pinrichStatus.trim() === '';
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
    todayCallAssigned: sellers.filter(isTodayCallAssigned).length,
    visitScheduled: sellers.filter(isVisitScheduled).length,
    visitCompleted: sellers.filter(isVisitCompleted).length,
    unvaluated: sellers.filter(isUnvaluated).length,
    mailingPending: sellers.filter(isMailingPending).length,
    todayCallNotStarted: sellers.filter(isTodayCallNotStarted).length,
    pinrichEmpty: sellers.filter(isPinrichEmpty).length,
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
    case 'todayCallAssigned':
      return sellers.filter(isTodayCallAssigned);
    case 'visitScheduled':
      return sellers.filter(isVisitScheduled);
    case 'visitCompleted':
      return sellers.filter(isVisitCompleted);
    case 'unvaluated':
      return sellers.filter(isUnvaluated);
    case 'mailingPending':
      return sellers.filter(isMailingPending);
    case 'todayCallNotStarted':
      return sellers.filter(isTodayCallNotStarted);
    case 'pinrichEmpty':
      return sellers.filter(isPinrichEmpty);
    case 'all':
    default:
      return sellers;
  }
};
