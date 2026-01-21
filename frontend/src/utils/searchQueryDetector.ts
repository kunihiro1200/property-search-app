/**
 * 検索クエリのタイプを検出するユーティリティ
 * 物件番号（AA, BB, CCで始まる）と所在地を自動判定
 */

export type SearchQueryType = 'property_number' | 'location';

export interface SearchQuery {
  type: SearchQueryType;
  value: string;
}

/**
 * 検索クエリが物件番号形式かどうかを判定
 * 物件番号は AA, BB, CC, DD, EE などのアルファベット2文字で始まる文字列
 * 
 * @param query - 検索クエリ文字列
 * @returns 物件番号形式の場合 true
 */
export function isPropertyNumber(query: string): boolean {
  if (!query || typeof query !== 'string') {
    return false;
  }

  const trimmedQuery = query.trim().toUpperCase();
  
  // アルファベット2文字で始まり、その後に数字が続くパターンをチェック
  // 例: AA123, BB456, CC789, DD012, EE2 など
  return /^[A-Z]{2}\d*$/.test(trimmedQuery);
}

/**
 * 検索クエリのタイプを検出
 * 
 * @param query - 検索クエリ文字列
 * @returns SearchQuery オブジェクト（type と value を含む）
 */
export function detectSearchType(query: string): SearchQuery {
  const trimmedQuery = query.trim();

  if (isPropertyNumber(trimmedQuery)) {
    return {
      type: 'property_number',
      value: trimmedQuery
    };
  }

  return {
    type: 'location',
    value: trimmedQuery
  };
}
