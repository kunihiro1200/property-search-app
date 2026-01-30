/**
 * 売主ステータス計算ユーティリティ
 * 
 * 売主リストのステータス表示ロジックを提供します。
 * 以下のステータスを判定します：
 * - 当日TEL（コミュニケーション情報あり）/ 当日TEL分（コミュニケーション情報なし）
 * - 訪問日前日
 * - 未査定
 * - Pinrich空欄
 * 
 * 【当日TELの判定ロジック】
 * 次電日が今日以前の場合、コミュニケーション情報の3つのフィールドをチェック：
 * 1. 連絡方法に入力あり → 当日TEL(連絡方法の内容)
 * 2. 連絡取りやすい時間に入力あり → 当日TEL(連絡取りやすい時間の内容)
 * 3. 電話担当に入力あり → 当日TEL(電話担当の内容)
 * 4. どれも入力なし → 当日TEL分
 */

import type { Seller } from '../types';

/**
 * 日付文字列をDateオブジェクトに変換
 * 
 * @param dateStr 日付文字列 (例: "2026/1/27" または "2026-01-27")
 * @returns Dateオブジェクト、または null
 * 
 * @example
 * parseDate("2026/1/27") // => Date(2026, 0, 27)
 * parseDate("2026-01-27") // => Date(2026, 0, 27)
 * parseDate(null) // => null
 */
export function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '') {
    return null;
  }

  try {
    // "2026/1/27" 形式または "2026-01-27" 形式をパース
    const parts = dateStr.includes('/') 
      ? dateStr.split('/') 
      : dateStr.split('-');
    
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
 * 日本時間（JST）で今日の日付を取得
 * 
 * @returns 日本時間の今日の日付（時刻は00:00:00）
 */
function getTodayJST(): Date {
  // 現在のUTC時刻を取得
  const now = new Date();
  
  // 日本時間（UTC+9）に変換
  const jstOffset = 9 * 60; // 9時間 = 540分
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jstTime = new Date(utcTime + (jstOffset * 60000));
  
  // 時刻をリセット
  jstTime.setHours(0, 0, 0, 0);
  
  return jstTime;
}

/**
 * 売主のステータスを計算する
 * 
 * 【共通条件】状況（当社）に「追客中」が含まれること
 * ※「追客中」「除外後追客中」「他決→追客中」など、「追客中」という文言を含む全ての状況が対象
 * 
 * 以下の順序でチェックし、全ての条件を満たすステータスを配列で返します：
 * 0. 訪問予定 - 営担に入力あり AND 訪問日が今日以降
 * 0. 訪問済み - 営担に入力あり AND 訪問日が昨日以前
 * 1. 当日TEL - 次電日が今日以前の場合
 *    - コミュニケーション情報（連絡方法/連絡取りやすい時間/電話担当）のいずれかに入力あり → 当日TEL(内容)
 *    - どれも入力なし → 当日TEL分
 * 2. 訪問日前日
 * 3. 未査定（査定方法が空 AND 反響日付が2026年1月1日以降）
 * 4. Pinrich空欄 - Pinrichフィールドが空欄の場合のみ
 * 
 * @param seller 売主データ
 * @returns ステータスの配列
 */
export function calculateSellerStatus(seller: Seller): string[] {
  const statuses: string[] = [];
  const today = getTodayJST(); // 日本時間で今日の日付を取得

  // 【共通条件】状況（当社）に「追客中」が含まれているかチェック
  const situationCompany = seller.situation_company || seller.status || '';
  const isFollowingUp = typeof situationCompany === 'string' && situationCompany.includes('追客中');
  
  // 追客中でない場合は、ステータスを表示しない
  if (!isFollowingUp) {
    return statuses;
  }

  // 営担（visitAssignee）を取得
  const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
  const hasVisitAssignee = visitAssignee && visitAssignee.trim() !== '';
  
  // 訪問日を取得
  const visitDateStr = seller.visit_date || seller.visitDate;
  const visitDate = parseDate(visitDateStr as string | null);

  // 0. 訪問予定/訪問済みチェック（営担に入力がある場合のみ）
  if (hasVisitAssignee && visitDate) {
    if (visitDate >= today) {
      // 訪問日が今日以降 → 訪問予定
      statuses.push(`訪問予定(${visitAssignee})`);
    } else {
      // 訪問日が昨日以前 → 訪問済み
      statuses.push(`訪問済み(${visitAssignee})`);
    }
  }

  // 次電日を取得（複数箇所で使用）
  const nextCallDate = parseDate(seller.next_call_date ?? null);
  const isNextCallDateToday = nextCallDate && nextCallDate <= today;

  // コミュニケーション情報の3つのフィールドを取得
  const phoneContactPerson = seller.phoneContactPerson || seller.phone_contact_person || seller.phone_person;
  const contactMethod = seller.contactMethod || seller.contact_method;
  const preferredContactTime = seller.preferredContactTime || seller.preferred_contact_time;

  // 1. 当日TEL チェック（次電日が今日以前の場合）
  // コミュニケーション情報の3つのフィールドのいずれかに入力がある場合は「当日TEL(内容)」
  // どれも入力がない場合は「当日TEL分」
  if (isNextCallDateToday) {
    // 優先順位: 連絡方法 > 連絡取りやすい時間 > 電話担当
    if (contactMethod && contactMethod.trim() !== '') {
      statuses.push(`当日TEL(${contactMethod})`);
    } else if (preferredContactTime && preferredContactTime.trim() !== '') {
      statuses.push(`当日TEL(${preferredContactTime})`);
    } else if (phoneContactPerson && phoneContactPerson.trim() !== '') {
      statuses.push(`当日TEL(${phoneContactPerson})`);
    } else {
      // どのコミュニケーション情報も入力がない場合のみ「当日TEL分」
      statuses.push('当日TEL分');
    }
  }

  // 2. 訪問日前日チェック
  if (isVisitDayBefore(seller.visit_date ?? null, today)) {
    statuses.push('訪問日前日');
  }

  // 査定方法の値を取得
  const valuationMethod = seller.valuationMethod || seller.valuation_method;
  const hasValuationMethod = valuationMethod && valuationMethod.trim() !== '';

  // 3. 未査定チェック
  // 条件: 査定方法に入力がない AND 反響日付が2026年1月1日以降
  if (!hasValuationMethod) {
    // inquiry_date（snake_case）またはinquiryDate（camelCase）を取得
    const inquiryDateStr = seller.inquiry_date || 
      (seller.inquiryDate ? (typeof seller.inquiryDate === 'string' ? seller.inquiryDate : seller.inquiryDate.toISOString().split('T')[0]) : null);
    const inquiryDate = parseDate(inquiryDateStr as string | null);
    const cutoffDate = new Date(2026, 0, 1);
    cutoffDate.setHours(0, 0, 0, 0);
    
    if (inquiryDate && inquiryDate >= cutoffDate) {
      statuses.push('未査定');
    }
  }

  // 4. Pinrich空欄チェック（Pinrichフィールドが空欄の場合のみ）
  const pinrichValue = seller.pinrichStatus || seller.pinrich_status || seller.pinrich;
  if (!pinrichValue || pinrichValue.trim() === '') {
    statuses.push('Pinrich空欄');
  }

  return statuses;
}