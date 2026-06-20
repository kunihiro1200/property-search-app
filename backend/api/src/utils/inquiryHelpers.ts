/**
 * 問い合わせ関連のヘルパー関数
 */

/**
 * 電話番号を正規化する
 * 
 * - ハイフン、空白、括弧を除去
 * - 全角数字を半角に変換
 * 
 * @param phone - 正規化する電話番号
 * @returns 正規化された電話番号（数字のみ）
 * 
 * @example
 * normalizePhoneNumber('090-1234-5678') // '09012345678'
 * normalizePhoneNumber('０９０１２３４５６７８') // '09012345678'
 * normalizePhoneNumber('(090) 1234-5678') // '09012345678'
 * normalizePhoneNumber('（090）1234-5678') // '09012345678'
 */
export function normalizePhoneNumber(phone: string): string {
  return phone
    // ハイフン、空白、括弧を除去
    .replace(/[-\s()（）]/g, '')
    // 全角数字を半角に変換
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
}

/**
 * 物件データ
 */
export interface PropertyData {
  property_number: string;
  site_display: boolean;
  athome_public_folder_id: string | null;
}

/**
 * 問合せ元を判定する
 * 
 * 物件の公開状態に基づいて問合せ元を判定します:
 * - site_display = true → 「公開中・いふう独自サイト」
 * - site_display = false かつ athome_public_folder_id が存在 → 「公開前・いふう独自サイト」
 * - site_display = false かつ athome_public_folder_id が存在しない → 「非公開・いふう独自サイト」
 * 
 * @param property - 物件データ
 * @returns 問合せ元の文字列
 * 
 * @example
 * determineInquirySource({ site_display: true, ... }) // '公開中・いふう独自サイト'
 * determineInquirySource({ site_display: false, athome_public_folder_id: 'abc', ... }) // '公開前・いふう独自サイト'
 * determineInquirySource({ site_display: false, athome_public_folder_id: null, ... }) // '非公開・いふう独自サイト'
 */
export function determineInquirySource(property: PropertyData): string {
  if (property.site_display === true) {
    return '公開中・いふう独自サイト';
  } else if (property.athome_public_folder_id) {
    return '公開前・いふう独自サイト';
  } else {
    return '非公開・いふう独自サイト';
  }
}

/**
 * 買主番号を自動採番する
 * 
 * E列から数値のみを抽出して最大値を取得し、+1を返します。
 * 数値が存在しない場合は1を返します。
 * 
 * @param columnEValues - E列の値の配列
 * @returns 新しい買主番号
 * 
 * @example
 * generateBuyerNumber(['1', '2', '3']) // 4
 * generateBuyerNumber(['1', 'テキスト', '5']) // 6
 * generateBuyerNumber([]) // 1
 * generateBuyerNumber(['テキスト', 'ABC']) // 1
 */
export function generateBuyerNumber(columnEValues: string[]): number {
  // 数値のみを抽出
  const numbers = columnEValues
    .map(value => parseInt(value, 10))
    .filter(num => !isNaN(num));
  
  // 最大値を取得（存在しない場合は0）
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  
  return maxNumber + 1;
}
