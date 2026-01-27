/**
 * 売主ステータス計算ユーティリティ
 * 
 * 売主リストのステータス表示ロジックを提供します。
 * 以下のステータスを判定します：
 * - 不通
 * - 訪問日前日
 * - 当日TEL（担当名）
 * - 当日TEL（未着手）
 * - Pinrich空欄
 */

import type { Seller } from '../types/seller';

/**
 * 日付文字列をDateオブジェクトに変換
 * 
 * @param dateStr 日付文字列 (例: "2026/1/27")
 * @returns Dateオブジェクト、または null
 * 
 * @example
 * parseDate("2026/1/27") // => Date(2026, 0, 27)
 * parseDate("2026-01-27") // => null (無効な形式)
 * parseDate(null) // => null
 */
export function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  try {
    // "2026/1/27" 形式をパース
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      return null;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 月は0始まり
    const day = parseInt(parts[2], 10);

    // 数値が有効かチェック
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    // 有効な日付かチェック
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.error('[sellerStatusUtils] 日付のパースに失敗:', dateStr, error);
    return null;
  }
}

/**
 * 訪問日前日かどうかを判定
 * 
 * 水曜日は休みのため、木曜日訪問の場合は火曜日（前々日）に表示
 * 
 * @param visitDateStr 訪問日文字列 (例: "2026/1/27")
 * @param today 今日の日付
 * @returns 訪問日前日かどうか
 * 
 * @example
 * // 今日が火曜日、訪問日が水曜日
 * isVisitDayBefore("2026/1/28", new Date(2026, 0, 27)) // => true
 * 
 * // 今日が火曜日、訪問日が木曜日（水曜休み）
 * isVisitDayBefore("2026/1/29", new Date(2026, 0, 27)) // => true
 * 
 * // 今日が月曜日、訪問日が木曜日
 * isVisitDayBefore("2026/1/29", new Date(2026, 0, 26)) // => false
 */
export function isVisitDayBefore(
  visitDateStr: string | null,
  today: Date
): boolean {
  const visitDate = parseDate(visitDateStr);
  if (!visitDate) {
    return false;
  }

  // 訪問日の曜日を取得（0=日曜, 1=月曜, ..., 6=土曜）
  const visitDayOfWeek = visitDate.getDay();

  // 訪問日が木曜日（4）の場合、前々日（火曜日）に表示
  if (visitDayOfWeek === 4) {
    const twoDaysBefore = new Date(visitDate);
    twoDaysBefore.setDate(visitDate.getDate() - 2);
    twoDaysBefore.setHours(0, 0, 0, 0);
    return today.getTime() === twoDaysBefore.getTime();
  }

  // それ以外の場合、前日に表示
  const oneDayBefore = new Date(visitDate);
  oneDayBefore.setDate(visitDate.getDate() - 1);
  oneDayBefore.setHours(0, 0, 0, 0);
  return today.getTime() === oneDayBefore.getTime();
}

/**
 * 当日TEL（未着手）かどうかを判定
 * 
 * 条件:
 * - 次電日が今日を含めて過去
 * - 状況（当社）に「追客中」を含む
 * - 不通カラムが空欄
 * 
 * @param seller 売主データ
 * @param today 今日の日付
 * @returns 当日TEL（未着手）かどうか
 * 
 * @example
 * const seller = {
 *   next_call_date: "2026/1/26",
 *   situation_company: "追客中",
 *   not_reachable: null
 * };
 * isCallTodayUnstarted(seller, new Date(2026, 0, 27)) // => true
 */
export function isCallTodayUnstarted(
  seller: Seller,
  today: Date
): boolean {
  // 次電日が今日を含めて過去かチェック
  const nextCallDate = parseDate(seller.next_call_date);
  if (!nextCallDate || nextCallDate > today) {
    return false;
  }

  // 状況（当社）に「追客中」を含むかチェック
  if (
    !seller.situation_company ||
    !seller.situation_company.includes('追客中')
  ) {
    return false;
  }

  // 不通カラムが空欄かチェック
  if (seller.not_reachable && seller.not_reachable.trim() !== '') {
    return false;
  }

  return true;
}

/**
 * 売主のステータスを計算する
 * 
 * 以下の順序でチェックし、全ての条件を満たすステータスを配列で返します：
 * 1. 不通
 * 2. 訪問日前日
 * 3. 当日TEL（担当名）
 * 4. 当日TEL（未着手）
 * 5. Pinrich空欄
 * 
 * @param seller 売主データ
 * @returns ステータスの配列
 * 
 * @example
 * const seller = {
 *   not_reachable: "不通",
 *   pinrich: null,
 *   // ... その他のフィールド
 * };
 * calculateSellerStatus(seller) // => ["不通", "Pinrich空欄"]
 */
export function calculateSellerStatus(seller: Seller): string[] {
  const statuses: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時刻をリセット

  // 1. 不通チェック
  if (seller.not_reachable && seller.not_reachable.trim() !== '') {
    statuses.push('不通');
  }

  // 2. 訪問日前日チェック
  if (isVisitDayBefore(seller.visit_date, today)) {
    statuses.push('訪問日前日');
  }

  // 3. 当日TEL（担当名）チェック
  if (seller.phone_person && seller.phone_person.trim() !== '') {
    const nextCallDate = parseDate(seller.next_call_date);
    if (nextCallDate && nextCallDate <= today) {
      statuses.push(`当日TEL（${seller.phone_person}）`);
    }
  }

  // 4. 当日TEL（未着手）チェック
  if (isCallTodayUnstarted(seller, today)) {
    statuses.push('当日TEL（未着手）');
  }

  // 5. Pinrich空欄チェック
  if (!seller.pinrich || seller.pinrich.trim() === '') {
    statuses.push('Pinrich空欄');
  }

  return statuses;
}
