/**
 * 新築年月フォーマットユーティリティ
 * 
 * 様々な形式の新築年月データを統一された日本語形式に変換します。
 */

/**
 * 新築年月を日本語形式にフォーマット
 * 
 * @param constructionDate - YYYY-MM, YYYY/MM, YYYYMM, YYYY年MM月, YYYY年MM月DD日などの形式
 * @returns YYYY年MM月形式の文字列、または null（無効な場合）
 * 
 * @example
 * formatConstructionDate('2020-03') // => '2020年03月'
 * formatConstructionDate('2020/3') // => '2020年03月'
 * formatConstructionDate('202003') // => '2020年03月'
 * formatConstructionDate('2020年3月') // => '2020年03月'
 * formatConstructionDate('2020年3月1日') // => '2020年03月'
 * formatConstructionDate(null) // => null
 */
export function formatConstructionDate(constructionDate: string | null | undefined): string | null {
  if (!constructionDate || typeof constructionDate !== 'string') {
    return null;
  }

  const trimmed = constructionDate.trim();
  if (!trimmed) {
    return null;
  }

  // すでに"YYYY年MM月"形式の場合（月が1桁の場合は0埋めして返す）
  const japaneseMatch = trimmed.match(/^(\d{4})年(\d{1,2})月$/);
  if (japaneseMatch) {
    const [, year, month] = japaneseMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // "YYYY年MM月DD日"形式（日付部分を削除）
  const japaneseWithDayMatch = trimmed.match(/^(\d{4})年(\d{1,2})月\d{1,2}日$/);
  if (japaneseWithDayMatch) {
    const [, year, month] = japaneseWithDayMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // "YYYY年MM月 DD日"形式（スペースあり、日付部分を削除）
  const japaneseWithSpaceMatch = trimmed.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (japaneseWithSpaceMatch) {
    const [, year, month] = japaneseWithSpaceMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // YYYY-MM形式
  const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (dashMatch) {
    const [, year, month] = dashMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // YYYY/MM形式
  const slashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, year, month] = slashMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // YYYY/MM/DD形式（日付部分を削除）
  const slashWithDayMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/\d{1,2}$/);
  if (slashWithDayMatch) {
    const [, year, month] = slashWithDayMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // YYYYMM形式
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})$/);
  if (compactMatch) {
    const [, year, month] = compactMatch;
    return `${year}年${month}月`;
  }

  // 認識できない形式
  console.warn(`[formatConstructionDate] Unrecognized format: ${constructionDate}`);
  return null;
}

/**
 * 物件タイプが新築年月表示対象かどうかを判定
 * 
 * @param propertyType - 物件タイプ（英語または日本語）
 * @returns 表示対象の場合true
 * 
 * @example
 * shouldShowConstructionDate('detached_house') // => true
 * shouldShowConstructionDate('戸建') // => true
 * shouldShowConstructionDate('apartment') // => true
 * shouldShowConstructionDate('land') // => false
 */
export function shouldShowConstructionDate(propertyType: string): boolean {
  // 英語の物件タイプ
  const englishTargetTypes = ['detached_house', 'apartment'];
  
  // 日本語の物件タイプ
  const japaneseTargetTypes = ['戸建', '戸建て', 'マンション'];
  
  return englishTargetTypes.includes(propertyType) || japaneseTargetTypes.includes(propertyType);
}
