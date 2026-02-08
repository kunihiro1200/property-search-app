/**
 * 日付ヘルパー関数
 * 
 * AppSheetのIFSロジックで使用される日付関連の条件判定をサポートします。
 */

/**
 * 指定された日付が今日かどうかを判定
 * @param date 判定する日付
 * @returns 今日の場合true
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return false;
  
  const today = new Date();
  return (
    targetDate.getFullYear() === today.getFullYear() &&
    targetDate.getMonth() === today.getMonth() &&
    targetDate.getDate() === today.getDate()
  );
}

/**
 * 指定された日付が明日かどうかを判定
 * @param date 判定する日付
 * @returns 明日の場合true
 */
export function isTomorrow(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return false;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return (
    targetDate.getFullYear() === tomorrow.getFullYear() &&
    targetDate.getMonth() === tomorrow.getMonth() &&
    targetDate.getDate() === tomorrow.getDate()
  );
}

/**
 * 指定された日付が過去かどうかを判定
 * @param date 判定する日付
 * @returns 過去の場合true
 */
export function isPast(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate < today;
}

/**
 * 指定された日付の曜日を日本語で取得
 * @param date 判定する日付
 * @returns 曜日（例: "月曜日", "火曜日"）
 */
export function getDayOfWeek(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return null;
  
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  return days[targetDate.getDay()];
}

/**
 * 今日の曜日を日本語で取得
 * @returns 曜日（例: "月曜日", "火曜日"）
 */
export function getTodayDayOfWeek(): string {
  return getDayOfWeek(new Date()) || '';
}

/**
 * 指定された日付が今日から指定日数後かどうかを判定
 * @param date 判定する日付
 * @param days 日数
 * @returns 指定日数後の場合true
 */
export function isDaysFromToday(date: Date | string | null | undefined, days: number): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return false;
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return (
    targetDate.getFullYear() === futureDate.getFullYear() &&
    targetDate.getMonth() === futureDate.getMonth() &&
    targetDate.getDate() === futureDate.getDate()
  );
}

/**
 * 指定された日付が今日以前かどうかを判定
 * @param date 判定する日付
 * @returns 今日以前の場合true
 */
export function isTodayOrPast(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate <= today;
}

/**
 * 指定された日付が指定範囲内かどうかを判定
 * @param date 判定する日付
 * @param minDaysAgo 最小日数（過去）
 * @param maxDaysAgo 最大日数（過去）
 * @returns 範囲内の場合true
 */
export function isWithinDaysAgo(
  date: Date | string | null | undefined,
  minDaysAgo: number,
  maxDaysAgo: number
): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - minDaysAgo);
  
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() - maxDaysAgo);
  
  return targetDate >= maxDate && targetDate <= minDate;
}

/**
 * 指定された日付が指定日付以降かどうかを判定
 * @param date 判定する日付
 * @param compareDate 比較する日付
 * @returns 指定日付以降の場合true
 */
export function isAfterOrEqual(
  date: Date | string | null | undefined,
  compareDate: Date | string
): boolean {
  if (!date) return false;
  
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return false;
  
  const compDate = typeof compareDate === 'string' ? new Date(compareDate) : compareDate;
  if (isNaN(compDate.getTime())) return false;
  
  targetDate.setHours(0, 0, 0, 0);
  compDate.setHours(0, 0, 0, 0);
  
  return targetDate >= compDate;
}
